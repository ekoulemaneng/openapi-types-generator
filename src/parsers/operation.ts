import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'
import setOperationRequestSchema from './request'
import setOperationResponsesSchema from './responses'

export type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

export interface OperationSchema extends Partial<JSONSchema> {}

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

export type SetOperationSchema = (schema: OpenAPI, path: string, operation: HttpMethod, group: 'paths' | 'webhooks') => OperationSchema

const setOperationSchema: SetOperationSchema = (schema, path, operation, group) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof path === 'undefined') throw errors.PathNotProvided
    if (typeof operation === 'undefined') throw errors.OperationNotProvided
    if (typeof group === 'undefined') throw errors.GroupNotProvided
    return {
        type: 'object',
        properties: {
            request: setOperationRequestSchema(schema, path, operation, group),
            responses: setOperationResponsesSchema(schema, path, operation, group)
        },
        additionalProperties: false,
        required: ['request', 'responses']
    }
}

export default setOperationSchema