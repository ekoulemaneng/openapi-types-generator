import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import HTTPStatusCode from 'openapi-objects-types/types/common/http-status-code'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'

export type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

export type Schema = OpenAPIv30x.Schema | OpenAPIv31x.Schema

export type Response = OpenAPIv30x.Response | OpenAPIv31x.Response

export type Responses = OpenAPIv30x.Responses | OpenAPIv31x.Responses

export type Header = OpenAPIv30x.Header | OpenAPIv31x.Header

export type PathItem = OpenAPIv30x.PathItem | OpenAPIv31x.PathItem

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

export type Status = HTTPStatusCode

export type Head = { 
    name: string    
    schema: Schema 
    required: boolean
}

export type Content = Array<{ 'Content-Type': string , schema: Schema }>

export interface ResponseSchema extends Partial<JSONSchema> {}

export type GetStatus = (responses: Responses) => Array<HTTPStatusCode>

export type ProcessContent = (content: Header['content']) => Schema

export type GetSchema = (schema: Schema, content: Header['content']) => Schema

export type GetHead = (name: string, header: Header) => Head

export type GetHeads = (response: Response) => Array<Head>

export type GetContent = (response: Response) => Content | null

export type GetOperationResponsesStatus = (schema: OpenAPI, path: string, operation: HttpMethod, group: 'paths' | 'webhooks') => Array<HTTPStatusCode>

export type GetOperationResponseHeads = (schema: OpenAPI, path: string, operation: HttpMethod, status: HTTPStatusCode, group: 'paths' | 'webhooks') => Array<Head>

export type GetOperationResponsesContents = (schema: OpenAPI, path: string, operation: HttpMethod, status: HTTPStatusCode, group: 'paths' | 'webhooks') => Content | null

export type SetOperationResponsesSchema = (schema: OpenAPI, path: string, operation: HttpMethod, group: 'paths' | 'webhooks') => ResponseSchema

const getStatus: GetStatus = (responses) => {
    if (typeof responses === 'undefined') throw errors.ResponsesNotProvided
    return Object.keys(responses) as Array<HTTPStatusCode>
}

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

export const getHead: GetHead = (name, header) => {
    if (typeof header === 'undefined') throw errors.HeaderNameNotProvided
    if (typeof header === 'undefined') throw errors.HeaderNotProvided
    if (typeof header.schema === 'undefined' && typeof header.content === 'undefined') throw errors.SchemaAndContentUndefined
    return {
        name,
        schema: getSchema(header.schema as Schema, header.content),
        required: header.required ?? false
    }
}

export const getHeads: GetHeads = (response) => {
    if (typeof response === 'undefined') throw errors.ResponseNotProvided
    const heads: Array<Head> =[]
    const headers = response.headers
    if (typeof headers === 'undefined') return []
    for (const name in headers) {
        if (headers.hasOwnProperty(name)) {
            const header = headers[name] as Header
            if (typeof header !== 'undefined') heads.push(getHead(name, header))
        }
    }
    return heads
}

export const getContent: GetContent = (response) => {
    let content: Content | null = null
    if (typeof response === 'undefined') return content
    else if (typeof response.content === 'undefined') return content
    else {
        content = []
        for (const contentType in response.content) {
            if (typeof contentType === 'undefined') continue
            const mediaType = response.content[contentType]
            if (typeof mediaType === 'undefined') continue
            const schema = mediaType['schema']
            if (typeof schema === 'undefined') continue
            content.push({ 'Content-Type': contentType, schema })
        }
        if (content.length === 0) content = null
        return content
    }
}

const getOperationResponsesStatus: GetOperationResponsesStatus = (schema, path, method, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    if (group === 'paths') {
        const paths = schema.paths
        if (typeof paths === 'undefined') throw errors.SchemaContainsNotPath
        const pathItem = paths[path]
        if (typeof pathItem === 'undefined') throw errors.PathContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.PathContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return []
        return getStatus(responses)
    }
    if (group === 'webhooks') {
        const webhooks = schema.webhooks as Record<string, PathItem>
        if (typeof webhooks === 'undefined') throw errors.SchemaContainsNotWebhook
        const pathItem = webhooks[path]
        if (typeof pathItem === 'undefined') throw errors.WebhookContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.WebhookContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return []
        return getStatus(responses)
    }
    else throw errors.GroupNotValid
}

const getOperationResponseHeads: GetOperationResponseHeads = (schema, path, method, status, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof status === 'undefined') throw errors.StatusNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    if (group === 'paths') {
        const paths = schema.paths
        if (typeof paths === 'undefined') throw errors.SchemaContainsNotPath
        const pathItem = paths[path]
        if (typeof pathItem === 'undefined') throw errors.PathContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.PathContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return []
        const response = responses[status] as Response
        if (typeof response === 'undefined') return []
        return getHeads(response)
    }
    else if (group === 'webhooks') {
        const webhooks = schema.webhooks as Record<string, PathItem>
        if (typeof webhooks === 'undefined') throw errors.SchemaContainsNotWebhook
        const pathItem = webhooks[path]
        if (typeof pathItem === 'undefined') throw errors.WebhookContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.WebhookContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return []
        const response = responses[status] as Response
        if (typeof response === 'undefined') return []
        return getHeads(response)
    }
    else throw errors.GroupNotValid
}

const getOperationResponsesContents: GetOperationResponsesContents = (schema, path, method, status, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof status === 'undefined') throw errors.StatusNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    if (group === 'paths') {
        const paths = schema.paths
        if (typeof paths === 'undefined') throw errors.SchemaContainsNotPath
        const pathItem = paths[path]
        if (typeof pathItem === 'undefined') throw errors.PathContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.PathContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return null
        const response = responses[status] as Response
        if (typeof response === 'undefined') return null
        return getContent(response)
    }
    else if (group === 'webhooks') {
        const webhooks = schema.webhooks as Record<string, PathItem>
        if (typeof webhooks === 'undefined') throw errors.SchemaContainsNotWebhook
        const pathItem = webhooks[path]
        if (typeof pathItem === 'undefined') throw errors.WebhookContainsNotOperation
        const operation = pathItem[method]
        if (typeof operation === 'undefined') throw errors.WebhookContainsNotOperation
        const responses = operation.responses
        if (typeof responses === 'undefined') return null
        const response = responses[status] as Response
        if (typeof response === 'undefined') return null
        return getContent(response)
    }
    else throw errors.GroupNotValid
}

const setOperationResponsesSchema: SetOperationResponsesSchema = (schema, path, method, group) => {
    // Check arguments
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof method === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    // Initialize the final output
    const responsesSchemas: ResponseSchema = { oneOf: [] }
    // Get status codes
    const statusCodes = getOperationResponsesStatus(schema, path, method, group)
    // Iterate over status codes
    statusCodes.forEach(statusCode => {
        // initialize a response schema
        const responseSchema: ResponseSchema = {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: [statusCode]
                }
            },
            additionalProperties: false,
            required: ['status']
        }
        // Get headers
        const headers = getOperationResponseHeads(schema, path, method, statusCode, group)
        // If headers length is greater than 0, then...
        if (headers.length > 0) {
            // Push 'headers' onto the response object required array
            if (typeof responseSchema.required === 'undefined') responseSchema.required = ['status', 'headers']
            else responseSchema.required.push('headers')
            // Get the response properties
            let responseProperties = responseSchema.properties
            if (typeof responseProperties === 'undefined') responseProperties = {
                status: {
                    type: 'string',
                    enum: [statusCode]
                }
            }
            // If the response properties oject is undefined, then..
            // Add 'headers' onto the response object properties and set its value
            responseProperties['headers'] = {
                type: 'object',
                properties: {},
                additionalProperties: true,
                required: []
            }
            // Iterate over the headers array
            for (const header of headers) {
                // Get headers properties and required properties
                const headersProperties = responseProperties['headers'].properties
                const requiredProperties = responseProperties['headers'].required
                // If headersProperties is not undefined
                if (typeof headersProperties !== 'undefined') {
                    // Add a header schema
                    headersProperties[header.name] = header.schema
                    // Add header name to required properties
                    if (typeof requiredProperties !== 'undefined' && header.required) requiredProperties.push(header.name) 
                }
            }
        }
        // Get responses contents
        const contents = getOperationResponsesContents(schema, path, method, statusCode, group)
        // If contents is null or its length equals zero, then....
        if (contents === null || contents.length === 0) responsesSchemas.oneOf?.push(responseSchema) // Add the response schema
        // else...
        else {
            // Iterate over contents
            contents.forEach(content => {
                //Get a copy of the response schema
                const _responseSchema: ResponseSchema = JSON.parse(JSON.stringify(responseSchema))
                // Push 'headers' and body onto the response object required array
                if (typeof _responseSchema.required === 'undefined') _responseSchema.required = ['status', 'headers', 'body']
                else _responseSchema.required.push('headers', 'body')
                // ---------- Add content-type header to headers properties and body content ----------
                let responseProperties = _responseSchema.properties
                if (typeof responseProperties === 'undefined') responseProperties = {
                    status: {
                        type: 'string',
                        enum: [statusCode]
                    }
                }
                // Add content-type header
                const headers = responseProperties['headers'] 
                if (typeof headers !== 'undefined') {
                    const headersProperties = headers.properties
                    if (typeof headersProperties !== 'undefined') headersProperties['Content-Type'] = {
                        type: 'string',
                        enum: [content['Content-Type']]
                    }
                    if (typeof headers.required !== 'undefined') headers.required.push('Content-Type')
                    else {
                        headers.required = []
                        headers.required?.push('Content-Type')
                    }
                }
                else if (typeof responseProperties['headers'] === 'undefined' || typeof responseProperties['headers'].properties === 'undefined' ) responseProperties['headers'] = {
                    type: 'object',
                    properties: {
                        'Content-Type': {
                            type: 'string',
                            enum: [content['Content-Type']]
                        }
                    },
                    additionalProperties: true,
                    required: ['Content-Type']
                }
                // Add body response
                let body = responseProperties['body']
                if (typeof body !== 'undefined') body = content.schema
                else responseProperties['body'] = content.schema
                // Add a new schema to the response
                if (typeof responsesSchemas.oneOf !== 'undefined') responsesSchemas.oneOf.push(_responseSchema)
                else {
                    responsesSchemas.oneOf = []
                    responsesSchemas.oneOf.push(_responseSchema)
                }
            })
        }
    })

    return responsesSchemas
}

export default setOperationResponsesSchema