import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'

export type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

export type Schema = OpenAPIv30x.Schema | OpenAPIv31x.Schema

export type PathItem = OpenAPIv30x.PathItem | OpenAPIv31x.PathItem

export type Parameter = OpenAPIv30x.Parameter | OpenAPIv31x.Parameter

export type RequestBody = OpenAPIv30x.RequestBody | OpenAPIv31x.RequestBody

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

export type Param = { 
    name: string 
    in: 'path' | 'header' | 'query' | 'cookie'   
    schema: Schema 
    required: boolean
}

export type Body = {
    content: Array<{ 'Content-Type': string , schema: Schema }>
    required: boolean
}

type Group = 'paths' | 'webhooks'

export interface RequestSchema extends Partial<JSONSchema> {}

export type ProcessContent = (content: Parameter['content']) => Schema

export type GetSchema = (schema: Schema, content: Parameter['content']) => Schema

export type GetParam = (parameter: Parameter) => Param

export type GetParams = (parameters: Array<Parameter>) => Array<Param>

export type GetPathParameters = (schema: OpenAPI, path: string, group: Group) => Array<Parameter>

export type GetOperationParameters = (schema: OpenAPI, path: string, method: HttpMethod, group: Group) => Array<Parameter>

export type GetOperationParams = (schema: OpenAPI, path: string, method: HttpMethod, group: Group) => Array<Param>

export type GetBody = (requestBody: RequestBody) => Body | null

export type GetOperationBody = (schema: OpenAPI, path: string, method: HttpMethod, group: Group) => Body | null

export type SetOperationRequestSchema = (schema: OpenAPI, path: string, method: HttpMethod, group: Group) => RequestSchema


const processContent: ProcessContent = (content) => {
    if (typeof content === 'undefined') throw errors.ContentNotProvided
    let _schema: Schema = {}
    const contentType = Object.keys(content)[0]
    if (typeof contentType === 'undefined') throw errors.ContentTypeUndefined
    const mediaType = content[contentType]
    if (typeof mediaType === 'undefined') throw errors.MediaTypeUndefined
    if (typeof mediaType.schema === 'undefined') throw errors.NoSchemaInMediaType
    _schema = mediaType.schema
    if (typeof mediaType.encoding !== 'undefined') {
        if (_schema.type === 'object' && typeof _schema.properties !== 'undefined') {
            for (const name in mediaType.encoding) {
                if (typeof name !== 'undefined') {
                    const sch = _schema.properties[name]
                    if (typeof sch !== 'undefined') {
                        const _contentType = mediaType.encoding[name]?.contentType
                        if (typeof _contentType !== 'undefined') {
                            sch.contentMediaType = _contentType
                        }
                    }
                }
            }
        }
    }
    return _schema
}

const getSchema: GetSchema = (schema, content) => {
    if (typeof schema === 'undefined' && typeof content === 'undefined') throw errors.SchemaAndContentNotProvided
    if (typeof schema !== 'undefined') return schema
    let _schema: Schema = {}
    if (typeof content !== 'undefined') _schema = processContent(content)
    return _schema
}

export const getParam: GetParam = (parameter) => {
    if (typeof parameter === 'undefined') throw errors.ParameterNotProvided
    if (typeof parameter.schema === 'undefined' && typeof parameter.content === 'undefined') throw errors.SchemaAndContentUndefined
    return {
        name: parameter.name,
        in: parameter.in,
        schema: getSchema(parameter.schema as Schema, parameter.content),
        required: parameter.in === 'path' ? true : (parameter.required ?? false)
    }
}

const getParams: GetParams = (parameters) => {
    if (typeof parameters === 'undefined') throw errors.ParametersNotProvided
    else if (!Array.isArray(parameters)) throw errors.ParametersNotArray
    else {
        const result: Array<Param> = []
        parameters.forEach(parameter => {
            const _parameter = getParam(parameter)
            if (_parameter) result.push(_parameter)
        })
        return result
    }
}

const getPathParameters: GetPathParameters = (schema, path, group) => {
        if (typeof schema === 'undefined') throw errors.SchemaNotProvided
        if (typeof path === 'undefined') throw errors.PathNotProvided
        if (typeof group === 'undefined') throw errors.GroupNotProvided
        else {
            if (group === 'paths') {
                const paths = schema.paths
                if (!paths) throw errors.NoPathInSchema
                const pathItem = paths[path]
                if (!pathItem) throw errors.SchemaContainsNotPath
                const parameters = pathItem['parameters']
                if (!parameters) return [] 
                return parameters as Array<unknown> as Array<Parameter>
            }
            else if (group === 'webhooks') {
                const webhooks = schema.webhooks as Record<string, PathItem>
                if (!webhooks) throw errors.NoWebhookInSchema
                const pathItem = webhooks[path]
                if (!pathItem) throw errors.SchemaContainsNotWebhook
                const parameters = pathItem['parameters']
                if (!parameters) return [] 
                return parameters as Array<unknown> as Array<Parameter>
            }
            else throw errors.GroupNotValid
        }
}

const getOperationParameters: GetOperationParameters = (schema, path, method, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    if (group === 'paths') {
        const paths = schema.paths
        if (!paths) throw errors.NoPathInSchema
        const pathItem = paths[path]
        if (!pathItem) throw errors.SchemaContainsNotPath
        const operation = pathItem[method]
        if (!operation) throw errors.PathContainsNotOperation
        const parameters = operation['parameters']
        if (!parameters) return [] 
        return parameters as Array<unknown> as Array<Parameter>
    }
    else if (group === 'webhooks') {
        const webhooks = schema.webhooks as Record<string, PathItem>
        if (!webhooks) throw errors.NoWebhookInSchema
        const pathItem = webhooks[path]
        if (!pathItem) throw errors.SchemaContainsNotWebhook
        const operation = pathItem[method]
        if (!operation) throw errors.PathContainsNotOperation
        const parameters = operation['parameters']
        if (!parameters) return [] 
        return parameters as Array<unknown> as Array<Parameter>
    }
    else throw errors.GroupNotValid
}

const getOperationParams: GetOperationParams = (schema, path, method, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    const pathParameters = getPathParameters(schema, path, group)
    const operationParameters = getOperationParameters(schema, path, method, group)
    const parameters = operationParameters.slice()
    pathParameters.forEach(parameter => {
        if (!parameters.some(param => param.name === parameter.name && param.in === parameter.in)) parameters.push(parameter)
    })
    return getParams(parameters)
}

export const getBody: GetBody = (body) => {
    let requestBody: Body | null = null
    if (typeof body === 'undefined') return requestBody
    if (!body.content) return requestBody
    else if (typeof body.content !== 'object') return requestBody
    else {
        requestBody = {
            content: [],
            required: false,
        }
        for (const contentType in body.content) {
            if (typeof contentType === 'undefined') continue
            const mediaType = body.content[contentType]
            if (typeof mediaType === 'undefined') continue
            const schema = mediaType['schema']
            if (typeof schema === 'undefined') continue
            requestBody.content.push({ 'Content-Type': contentType, schema })
            requestBody.required = body.required ?? false
        }
        if (requestBody.content.length === 0) requestBody = null
        return requestBody
    }
}

const getOperationBody: GetOperationBody = (schema, path, method, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    if (group === 'paths') {
        const paths = schema.paths
        if (!paths) return null
        const pathItem = paths[path]
        if (!pathItem) return null
        const operation = pathItem[method]
        if (!operation) return null
        const requestBody = operation['requestBody']
        if (!requestBody) return null
        return getBody(requestBody as RequestBody)
    }
    else if (group === 'webhooks') {
        const webhooks = schema.webhooks as Record<string, PathItem>
        if (!webhooks) return null
        const pathItem = webhooks[path]
        if (!pathItem) return null
        const operation = pathItem[method]
        if (!operation) return null
        const requestBody = operation['requestBody']
        if (!requestBody) return null
        return getBody(requestBody as RequestBody)
    }
    else throw errors.GroupNotValid
}

const setOperationSchema: SetOperationRequestSchema = (schema, path, method, group) => {

    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided

    // Initialize the result
    const requestSchemas: RequestSchema = { oneOf: [] }

    // Get non setted schemas
    const parameters = getOperationParams(schema, path, method, group)
    const requestBody = getOperationBody(schema, path, method, group)

    // Set a json schema
    const jsonSchema: RequestSchema = {
        type: 'object',
        properties: {
            path: {
                type: 'object',
                properties: {},
                required: [] as Array<string>,
                additionalProperties: false
            },
            headers: {
                type: 'object',
                properties: {},
                required: [] as Array<string>,
                additionalProperties: true
            },
            cookies: {
                type: 'object',
                properties: {},
                required: [] as Array<string>,
                additionalProperties: true
            },
            query: {
                type: 'object',
                properties: {},
                required: [] as Array<string>,
                additionalProperties: true
            }
        },
        required: [] as Array<string>,
        additionalProperties: false
    }

    // Populate parameters keys in the json schema object
    let channels: Array<string> = ['path', 'header', 'cookie', 'query']
    for (const channel of channels) {
        for (const parameter of parameters) {
            if (parameter.in === channel) {
                const properties = jsonSchema.properties
                if (typeof properties !== 'undefined') {
                    if (channel === 'header') {
                        if (typeof properties['headers'] !== 'undefined') {
                            const headersProperties = properties['headers'].properties
                            if (typeof headersProperties !== 'undefined') headersProperties[parameter.name] = parameter.schema
                        }
                    }
                    else if (channel === 'cookie') {
                        if (typeof properties['cookies'] !== 'undefined') {
                            const cookiesProperties = properties['cookies'].properties
                            if (typeof cookiesProperties !== 'undefined') cookiesProperties[parameter.name] = parameter.schema
                        }
                    }
                    else {
                        const channelProperty = properties[channel]
                        if (typeof channelProperty !== 'undefined') {
                            const channelProperties = channelProperty.properties
                            if (typeof channelProperties !== 'undefined') channelProperties[parameter.name] = parameter.schema
                        }
                    }
                    if (channel === 'path' || parameter.required) {
                        if (channel === 'header') {
                            if (typeof properties['headers'] !== 'undefined') {
                                const requiredHeaders = properties['headers'].required
                                if (typeof requiredHeaders !== 'undefined') requiredHeaders.push(parameter.name)
                            }
                        }
                        else if (channel === 'cookie') {
                            if (typeof properties['cookies'] !== 'undefined') {
                                const requiredCookies = properties['cookies'].required
                                if (typeof requiredCookies !== 'undefined') requiredCookies.push(parameter.name)
                            }
                        }
                        else {
                            const channelProperty = properties[channel]
                            if (typeof channelProperty !== 'undefined') {
                                const requiredChannel = channelProperty.required
                                if (typeof requiredChannel !== 'undefined') requiredChannel.push(parameter.name)
                            }
                        }
                    }
                }
            }
        }
    }

    // Populate required arrays
    channels = ['path', 'headers', 'cookies', 'query']
    for (const channel of channels) {
        const properties = jsonSchema.properties
        if (typeof properties !== 'undefined') {
            const channelProperty = properties[channel]
            if (typeof channelProperty !== 'undefined') {
                const channelProperties = channelProperty.properties
                if (typeof channelProperties !== 'undefined') {
                    if (Object.keys(channelProperties).length > 0) {
                        const required = jsonSchema.required
                        if (typeof required !== 'undefined') required.push(channel)
                    }
                }
            }
        }
    }

    // Populate the request schema object with request boday value or not the return the final result
    if (!requestBody || requestBody.content.length === 0) {
        requestSchemas.oneOf?.push(jsonSchema)
        return requestSchemas
    }
    else {
        requestBody.content.forEach(content => {
            const _jsonSchema: RequestSchema = JSON.parse(JSON.stringify(jsonSchema))
            const properties = _jsonSchema.properties
            if (typeof properties !== 'undefined') {
                properties['body'] = content.schema
                const headersProperty = properties['headers']
                if (typeof headersProperty !== 'undefined') {
                    const headersProperties = headersProperty.properties
                    if (typeof headersProperties !== 'undefined') headersProperties['Content-Type'] = { type: 'string', enum: [`${content['Content-Type']}`] }
                }
            }
            if (!requestBody.required) requestSchemas.oneOf?.push(_jsonSchema)
            else {
                if (typeof properties !== 'undefined') {
                    const headersProperty = properties['headers']
                    if (typeof headersProperty !== 'undefined') {
                        const requiredHeaders = headersProperty.required
                        if (typeof requiredHeaders !== 'undefined' && !requiredHeaders.includes('Content-Type')) requiredHeaders.push('Content-Type')
                    }
                }
                const _required = _jsonSchema.required
                if (typeof _required !== 'undefined') {
                    if (!_required.includes('headers')) _required.push('headers')
                    _required.push('body')
                }
                requestSchemas.oneOf?.push(_jsonSchema)
            }
        })
        return requestSchemas
    }
}

export default setOperationSchema
