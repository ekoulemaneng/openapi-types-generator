#!/usr/bin/env node

import { Command } from 'commander'
import { JSONSchema, compile } from 'json-schema-to-typescript'
import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { Resolver } from '@stoplight/json-ref-resolver'
import { IResolveError } from '@stoplight/json-ref-resolver/types'
import { OpenAPIv30x, OpenAPIv31x } from 'openapi-objects-types'
import setPathsSchema from './parsers/paths'
import setWebhooksSchema from './parsers/webhooks'
import setComponentsSchema from './parsers/components'

const program = new Command()

program.requiredOption('-i --input <file>').requiredOption('-o --output <file>')

program.parse()

const options: { input: string, output: string } = program.opts()

const SpecificationNotProvided = new Error('specification object or file (json, yaml or yaml) is not provided')
const SpecificationFormatNotValid = new Error('specification must be an object or a path to a specification file')
const SpecificationFileNotValid = new Error('specification file must be a json, yaml or yaml file')

const specGetter = async (spec: string) => {
    if (!spec) throw SpecificationNotProvided
    let schema: OpenAPIv31x.OpenAPI | OpenAPIv30x.OpenAPI
    if (typeof spec !== 'string') throw SpecificationFormatNotValid
    else {
        const filePath = path.resolve(process.cwd(), spec)
        const data = await fs.promises.readFile(filePath, 'utf8')
        const ext = path.extname(filePath).toLowerCase()
        if (['.yaml', '.yml'].includes(ext)) schema = yaml.parse(data)
        else if (ext === '.json') schema = JSON.parse(data)
        else throw SpecificationFileNotValid
    }
    const resolver = new Resolver()
    const schemaResolved = await resolver.resolve(schema)
    if (schemaResolved && schemaResolved.errors.length > 0) {
        const errors: Array<IResolveError> = []
        schemaResolved.errors.forEach(error => errors.push(error))
        throw new Error(JSON.stringify(errors))
    }
    return schemaResolved.result as OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI
}

const main = async (inputFile: string, outputFile: string) => {
    const schema = await specGetter(inputFile)
    const pathsInterface = setPathsSchema(schema)
    const webhooksInterface = setWebhooksSchema(schema)
    const componentsInterface = setComponentsSchema(schema)
    const interfaces = await compile(pathsInterface as JSONSchema, 'Paths') + '\n' 
                       + await compile(webhooksInterface as JSONSchema, 'Webhooks', { bannerComment: '' }) + '\n'
                       + await compile(componentsInterface as JSONSchema, 'Components', { bannerComment: '' })
    const filePath = path.resolve(process.cwd(), outputFile)
    await fs.promises.writeFile(filePath, interfaces)
    console.log('Done!')
}

main(options.input, options.output)
