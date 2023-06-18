import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'
import setOperationSchema from './operation'
import { setComponentsToken } from './components'

export type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

export type Components = OpenAPIv30x.Components | OpenAPIv31x.Components

export interface PathSchema extends Partial<JSONSchema> {}

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

export type SetPathSchema = (schema: OpenAPI, path: string) => PathSchema

export interface PathsSchema extends Partial<JSONSchema> { components?: Record<string, Record<string, Partial<JSONSchema>>> }

export type SetPathsSchema = (schema: OpenAPI) => PathsSchema

const setPathSchema: SetPathSchema = (schema, path) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    // initialize the path schema
    const pathSchema: PathSchema = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: []
    }
    // Get paths
    const paths = schema.paths
    if (typeof paths === 'undefined') throw errors.SchemaContainsNotPath
    // Get path item
    const pathItem = paths[path]
    if (typeof pathItem === 'undefined') throw errors.NoPathInSchema
    // Get operation
    for (const key in pathItem) {
        const value = pathItem[key]
        if (typeof value !== 'undefined' && ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(key)) {
            // Add operation schema
            if (typeof pathSchema.properties !== 'undefined') pathSchema.properties[key] = setOperationSchema(schema, path, key as HttpMethod, 'paths')
            else {
                pathSchema.properties = {}
                pathSchema.properties[key] = setOperationSchema(schema, path, key as HttpMethod, 'paths')
            }
            // Add operation in required array
            if (typeof pathSchema.required !== 'undefined') pathSchema.required.push(key)
            else {
                pathSchema.required = []
                pathSchema.required.push(key)
            }
        }
    }
    // Return path schema
    return pathSchema
}

const setPathsSchema: SetPathsSchema = (schema) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    // initialize the path schema
    const pathsSchema: PathsSchema = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
        components: setComponentsToken(schema)
    }
    // Get paths
    const paths = schema.paths
    if (typeof paths === 'undefined') return pathsSchema
    // Get operation
    for (const path in paths) {
        const value = paths[path]
        if (typeof value !== 'undefined') {
            // Add operation schema
            if (typeof pathsSchema.properties !== 'undefined') pathsSchema.properties[path] = setPathSchema(schema, path)
            else {
                pathsSchema.properties = {}
                pathsSchema.properties[path] = setPathSchema(schema, path)
            }
            // Add operation in required array
            if (typeof pathsSchema.required !== 'undefined') pathsSchema.required.push(path)
            else {
                pathsSchema.required = []
                pathsSchema.required.push(path)
            }
        }
    }
    // Return path schema
    return pathsSchema
}

export default setPathsSchema