import { OpenAPIv31x, OpenAPIv30x } from 'openapi-objects-types'
import JSONSchema from 'openapi-objects-types/types/3.1.x/json-schema'
import * as errors from './errors'
import setOperationSchema from './operation'
import { setComponentsToken } from './components'

export type OpenAPI = OpenAPIv30x.OpenAPI | OpenAPIv31x.OpenAPI

export type Components = OpenAPIv30x.Components | OpenAPIv31x.Components

export type PathItem = OpenAPIv30x.PathItem | OpenAPIv31x.PathItem

export interface WebhookSchema extends Partial<JSONSchema> {}

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

export type SetWebhookSchema = (schema: OpenAPI, webhook: string) => WebhookSchema

export interface WebhooksSchema extends Partial<JSONSchema> { components?: Record<string, Record<string, Partial<JSONSchema>>> }

export type SetWebhooksSchema = (schema: OpenAPI) => WebhooksSchema

const setWebhookSchema: SetWebhookSchema = (schema, webhook) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    if (typeof webhook === 'undefined') throw errors.WebhookNotProvided
    // initialize the path schema
    const WebhookSchema: WebhookSchema = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: []
    }
    // Get paths
    const webhooks = schema.webhooks as Record<string, PathItem>
    if (typeof webhooks === 'undefined') throw errors.SchemaContainsNotWebhook
    // Get path item
    const pathItem = webhooks[webhook]
    if (typeof pathItem === 'undefined') throw errors.NoWebhookInSchema
    // Get operation
    for (const key in pathItem) {
        const value = pathItem[key]
        if (typeof value !== 'undefined' && ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(key)) {
            // Add operation schema
            if (typeof WebhookSchema.properties !== 'undefined') WebhookSchema.properties[key] = setOperationSchema(schema, webhook, key as HttpMethod, 'webhooks')
            else {
                WebhookSchema.properties = {}
                WebhookSchema.properties[key] = setOperationSchema(schema, webhook, key as HttpMethod, 'webhooks')
            }
            // Add operation in required array
            if (typeof WebhookSchema.required !== 'undefined') WebhookSchema.required.push(key)
            else {
                WebhookSchema.required = []
                WebhookSchema.required.push(key)
            }
        }
    }
    // Return path schema
    return WebhookSchema
}

const setWebhooksSchema: SetWebhooksSchema = (schema) => {
    if (typeof schema === 'undefined') throw errors.SchemaNotProvided
    // initialize the path schema
    const webhooksSchema: WebhooksSchema = {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
        components: setComponentsToken(schema)
    }
    // Get webhooks
    const webhooks = schema.webhooks as Record<string, PathItem>
    if (typeof webhooks === 'undefined') return webhooksSchema // throw errors.NoWebhookInSchema
    // Get operation
    for (const webhook in webhooks) {
        const pathItem = webhooks[webhook]
        if (typeof pathItem !== 'undefined') {
            // Add webhook schema
            if (typeof webhooksSchema.properties !== 'undefined') webhooksSchema.properties[webhook] = setWebhookSchema(schema, webhook)
            else {
                webhooksSchema.properties = {}
                webhooksSchema.properties[webhook] = setWebhookSchema(schema, webhook)
            }
            // Add operation in required array
            if (typeof webhooksSchema.required !== 'undefined') webhooksSchema.required.push(webhook)
            else {
                webhooksSchema.required = []
                webhooksSchema.required.push(webhook)
            }
        }
    }
    // Return webhook schema
    return webhooksSchema
}

export default setWebhooksSchema