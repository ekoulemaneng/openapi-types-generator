import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'
import { getContent, getHead, getHeads } from './responses'
import { getBody, getParam } from './request'

type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

type Schema = OpenAPIv30x.Schema | OpenAPIv31x.Schema

type Response = OpenAPIv30x.Response | OpenAPIv31x.Response

type Parameter = OpenAPIv30x.Parameter | OpenAPIv31x.Parameter

type RequestBody = OpenAPIv30x.RequestBody | OpenAPIv31x.RequestBody

type Header = OpenAPIv30x.Header | OpenAPIv31x.Header

type ComponentsToken = {
    schemas?: Record<string, Partial<JSONSchema>>
    responses?: Record<string, Partial<JSONSchema>>
    parameters?: Record<string, Partial<JSONSchema>>
    requestBodies?: Record<string, Partial<JSONSchema>>
    headers?: Record<string, Partial<JSONSchema>>
}

type SetResponseSchema = (response: Response) => Partial<JSONSchema>

type SetParameterSchema = (parameter: Parameter) => Partial<JSONSchema>

type SetRequestBodySchema = (resquestBody: RequestBody) => Partial<JSONSchema>

type SetHeaderSchema = (name: string, header: Header) => Partial<JSONSchema>

type SetComponentsToken = (schema: OpenAPI) => ComponentsToken

type SetComponentsSchema = (schema: OpenAPI) => Partial<JSONSchema>

const setResponseSchema: SetResponseSchema = (response) => {
    if (typeof response === 'undefined') throw errors.ResponseNotProvided
    // -----
    const responsesSchemas: Partial<JSONSchema> = { oneOf: [] }
    // -----
    const responseSchema: Partial<JSONSchema> = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: []
    }
    // -----
    const heads = getHeads(response)
    if (heads.length > 0) {
        responseSchema.required?.push('headers')
        const responseSchemaProperties = responseSchema.properties
        if (typeof responseSchemaProperties !== 'undefined') {
            responseSchemaProperties['headers'] = {
                type: 'object',
                properties: heads.reduce((props, head) => { 
                    props[head.name] = head.schema 
                    return props
                }, {} as Record<string, Partial<JSONSchema>>),
                additionalProperties: true,
                required: heads.reduce((props, head) => {
                    if (head.required) props.push(head.name)
                    return props
                }, [] as Array<string>)
            } 
        }
    }
    // -----
    const contents = getContent(response)
    if (contents === null || contents.length === 0) responsesSchemas.oneOf?.push(responseSchema)
    else {
        const _responseSchema: Partial<JSONSchema> = JSON.parse(JSON.stringify(responseSchema))   
        _responseSchema.required?.push('body')
        for (const content of contents) {
            const _responseSchemaProperties = _responseSchema.properties
            if (typeof _responseSchemaProperties !== 'undefined') {
                const _responseSchemaPropertiesHeaders = _responseSchemaProperties['headers']
                if (typeof _responseSchemaPropertiesHeaders !== 'undefined') {
                    let _headersProperties = _responseSchemaPropertiesHeaders.properties
                    if (typeof _headersProperties !== 'undefined') _headersProperties['Content-Type'] = { type: 'string', enum: [content['Content-Type']] }
                    else _headersProperties = { 'Content-Type': { type: 'string', enum: [content['Content-Type']] } }
                    let _requiredProperties = _responseSchemaPropertiesHeaders.required
                    if (typeof _requiredProperties !== 'undefined') _requiredProperties.push('Content-Type')
                    else _requiredProperties = ['Content-Type']
                }
            }
            responsesSchemas.oneOf?.push(_responseSchema)
        }
    }
    // -----
    return responsesSchemas
}

const setParameterSchema: SetParameterSchema = (parameter) => {
    if (typeof parameter === 'undefined') throw errors.ParameterNotProvided
    return getParam(parameter).schema
}

const setRequestBodySchema: SetRequestBodySchema = (requestBody) => {
    if (typeof requestBody === 'undefined') throw errors.RequestBodyNotProvided
    const bodiesSchemas: Partial<JSONSchema> = { oneOf: [] }
    const body = getBody(requestBody)
    if (body === null) return bodiesSchemas
    const contents = body.content
    if (contents.length === 0) return bodiesSchemas
    for (const content of contents) bodiesSchemas.oneOf?.push({
        type: 'object',
        properties: {
            headers: {
                type: 'object',
                properties: {
                    'Content-Type': {
                        type: 'string',
                        enum: [content['Content-Type']]
                    }
                },
                additionalProperties: true,
                required: ['Content-Type']
            },
            body: content.schema
        },
        additionalProperties: false,
        required: ['headers', 'body']
    })
    return bodiesSchemas
}

const setHeaderSchema: SetHeaderSchema = (name, header) => {
    if (typeof name === 'undefined') throw errors.HeaderNameNotProvided
    if (typeof header === 'undefined') throw errors.HeaderNotProvided
    return getHead(name, header).schema
}

export const setComponentsToken: SetComponentsToken = (schema) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    const componentsToken: ComponentsToken = {}
    const components = schema.components
    if (typeof components === 'undefined') return componentsToken
    for (const component in components) {
        if (component === 'schemas') {
            const schemas = components['schemas']
            const _schemas: Record<string, Partial<JSONSchema>> = {}
            if (typeof schemas !== 'undefined') {
                for (const key in schemas) {
                    const schema = schemas[key] as Schema
                    _schemas[key] = schema
                }
            }
            componentsToken['schemas'] = _schemas
        }
        else if (component === 'responses') {
            const responses = components['responses']
            const _responses: Record<string, Partial<JSONSchema>> = {}
            if (typeof responses !== 'undefined') {
                for (const key in responses) {
                    const response = responses[key] as Response
                    _responses[key] = setResponseSchema(response)
                }
            }
            componentsToken['responses'] = _responses
        }
        else if (component === 'parameters') {
            const parameters = components['parameters']
            const _parameters: Record<string, Partial<JSONSchema>> = {}
            if (typeof parameters !== 'undefined') {
                for (const key in parameters) {
                    const parameter = parameters[key] as Parameter
                    _parameters[key] = setParameterSchema(parameter)
                }
            }
            componentsToken['parameters'] = _parameters
        }
        else if (component === 'requestBodies') {
            const requestBodies = components['requestBodies']
            const _requestBodies: Record<string, Partial<JSONSchema>> = {}
            if (typeof requestBodies !== 'undefined') {
                for (const key in requestBodies) {
                    const requestBody = requestBodies[key] as RequestBody
                    _requestBodies[key] = setRequestBodySchema(requestBody)
                }
            }
            componentsToken['requestBodies'] = _requestBodies
        }
        else if (component === 'headers') {
            const headers = components['headers']
            const _headers: Record<string, Partial<JSONSchema>> = {}
            if (typeof headers !== 'undefined') {
                for (const key in headers) {
                    const header = headers[key] as Header
                    _headers[key] = setHeaderSchema(key, header)
                }
            }
            componentsToken['headers'] = _headers
        }
    }
    return componentsToken
}

const setComponentsSchema: SetComponentsSchema = (schema) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    const componentsSchema: Partial<JSONSchema> = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: []
    }
    const components = schema.components
    if (typeof components === 'undefined') return componentsSchema
    for (const component in components) {
        if (component === 'schemas') {
            const schemas = components['schemas']
            if (typeof schemas !== 'undefined') {
                const _schemas: Partial<JSONSchema> = {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                    required: []
                }
                for (const key in schemas) {
                    const schema = schemas[key] as Schema
                    const _schemasProperties = _schemas.properties
                    if (typeof _schemasProperties !== 'undefined') _schemasProperties[key] = schema
                    const _schemasPropertiesRequired = _schemas.required
                    if (typeof _schemasPropertiesRequired !== 'undefined') _schemasPropertiesRequired.push(key)
                }
                if (Object.keys(schemas).length > 0) {
                    const componentsSchemaProperties = componentsSchema.properties
                    if (typeof componentsSchemaProperties !== 'undefined') componentsSchemaProperties['schemas'] = _schemas
                    const componentsSchemaPropertiesRequired = componentsSchema.required
                    if (typeof componentsSchemaPropertiesRequired !== 'undefined') componentsSchemaPropertiesRequired.push('schemas')
                }
            }
        }
        else if (component === 'responses') {
            const responses = components['responses']
            if (typeof responses !== 'undefined') {
                const _responses: Partial<JSONSchema> = {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                    required: []
                }
                for (const key in responses) {
                    const response = responses[key] as Response
                    const _responsesProperties = _responses.properties
                    if (typeof _responsesProperties !== 'undefined') _responsesProperties[key] = setResponseSchema(response)
                    const _responsesPropertiesRequired = _responses.required
                    if (typeof _responsesPropertiesRequired !== 'undefined') _responsesPropertiesRequired.push(key)
                }
                if (Object.keys(responses).length > 0) {
                    const componentsSchemaProperties = componentsSchema.properties
                    if (typeof componentsSchemaProperties !== 'undefined') componentsSchemaProperties['responses'] = _responses
                    const componentsSchemaPropertiesRequired = componentsSchema.required
                    if (typeof componentsSchemaPropertiesRequired !== 'undefined') componentsSchemaPropertiesRequired.push('responses')
                }
            }
        }
        else if (component === 'parameters') {
            const parameters = components['parameters']
            if (typeof parameters !== 'undefined') {
                const _parameters: Partial<JSONSchema> = {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                    required: []
                }
                for (const key in parameters) {
                    const parameter = parameters[key] as Parameter
                    const _parametersProperties = _parameters.properties
                    if (typeof _parametersProperties !== 'undefined') _parametersProperties[key] = setParameterSchema(parameter)
                    const _parametersPropertiesRequired = _parameters.required
                    if (typeof _parametersPropertiesRequired !== 'undefined') _parametersPropertiesRequired.push(key)
                }
                if (Object.keys(parameters).length > 0) {
                    const componentsSchemaProperties = componentsSchema.properties
                    if (typeof componentsSchemaProperties !== 'undefined') componentsSchemaProperties['parameters'] = _parameters
                    const componentsSchemaPropertiesRequired = componentsSchema.required
                    if (typeof componentsSchemaPropertiesRequired !== 'undefined') componentsSchemaPropertiesRequired.push('parameters')
                }
            }
        }
        else if (component === 'requestBodies') {
            const requestBodies = components['requestBodies']
            if (typeof requestBodies !== 'undefined') {
                const _requestBodies: Partial<JSONSchema> = {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                    required: []
                }
                for (const key in requestBodies) {
                    const requestBody = requestBodies[key] as RequestBody
                    const _requestBodiesProperties = _requestBodies.properties
                    if (typeof _requestBodiesProperties !== 'undefined') _requestBodiesProperties[key] = setRequestBodySchema(requestBody)
                    const _requestBodiesPropertiesRequired = _requestBodies.required
                    if (typeof _requestBodiesPropertiesRequired !== 'undefined') _requestBodiesPropertiesRequired.push(key)
                }
                if (Object.keys(requestBodies).length > 0) {
                    const componentsSchemaProperties = componentsSchema.properties
                    if (typeof componentsSchemaProperties !== 'undefined') componentsSchemaProperties['requestBodies'] = _requestBodies
                    const componentsSchemaPropertiesRequired = componentsSchema.required
                    if (typeof componentsSchemaPropertiesRequired !== 'undefined') componentsSchemaPropertiesRequired.push('requestBodies')
                }
            }
        }
        else if (component === 'headers') {
            const headers = components['headers']
            if (typeof headers !== 'undefined') {
                const _headers: Partial<JSONSchema> = {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                    required: []
                }
                for (const key in headers) {
                    const header = headers[key] as Header
                    const _headersProperties = _headers.properties
                    if (typeof _headersProperties !== 'undefined') _headersProperties[key] = setHeaderSchema(key, header)
                    const _headersPropertiesRequired = _headers.required
                    if (typeof _headersPropertiesRequired !== 'undefined') _headersPropertiesRequired.push(key)
                }
                if (Object.keys(headers).length > 0) {
                    const componentsSchemaProperties = componentsSchema.properties
                    if (typeof componentsSchemaProperties !== 'undefined') componentsSchemaProperties['headers'] = _headers
                    const componentsSchemaPropertiesRequired = componentsSchema.required
                    if (typeof componentsSchemaPropertiesRequired !== 'undefined') componentsSchemaPropertiesRequired.push('headers')
                }
            }
        }
    }
    return componentsSchema
}

export default setComponentsSchema