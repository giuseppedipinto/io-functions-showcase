import * as express from "express";
import * as t from "io-ts";

import { Context } from "@azure/functions";
import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  AzureUserAttributesMiddleware,
  IAzureUserAttributes
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredQueryParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_query_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { IResponseErrorQuery } from "@pagopa/io-functions-commons/dist/src/utils/response";

import { cosmosdbClient } from "../utils/cosmosdb";
import { FeedOptions, SqlQuerySpec } from "@azure/cosmos";

type IGetProductsHandler = (
  context: Context,
  userAttrs: IAzureUserAttributes,
  items: unknown,
  ctoken: unknown,
  category: unknown
) => Promise<
  | IGetProductsHandlerResult
  | IResponseSuccessJson<{
      readonly message: string;
    }>
  | IResponseErrorNotFound
>;

type IGetProductsHandlerResult =
  | IResponseErrorQuery
  | IResponseSuccessJson<{
      readonly items: ReadonlyArray<Object>;
      readonly page_size: number;
    }>;

export const GetProductsHandler = (): IGetProductsHandler => async (
  ctx,
  userAttrs,
  items,
  ctoken,
  category
): Promise<
  IResponseSuccessJson<{
    readonly message: string;
  }>
> => {
  let response = await callProductsPagination(
    <number>items,
    <string>ctoken,
    <string>category
  );

  return ResponseSuccessJson({
    headers: ctx.req?.headers,
    message: `Ciao ${userAttrs.email}!`,
    items: items,
    token: response.continuationToken,
    products: response.result,
    user: userAttrs
  });
};

const callProductsPagination = async (
  pageLimit: number,
  contToken: string,
  category?: string
): Promise<{
  result: Array<any>;
  hasMoreResults: boolean;
  continuationToken: string;
}> => {
  let sqlQuery = "SELECT * from products";
  category ? (sqlQuery += ` where products.CategoryName = "${category}"`) : "";
  console.log({ sqlQuery });

  const {
    result,
    hasMoreResults,
    continuationToken
  } = await queryContainerNext(
    {
      query: sqlQuery
    },
    {
      maxItemCount: pageLimit,
      continuationToken: contToken
    },
    process.env.COSMOSDB_PRODUCTS_COLLECTION as string
  );

  return {
    result: result || [],
    hasMoreResults: hasMoreResults || false,
    continuationToken: continuationToken || ""
  };
};

const queryContainerNext = async (
  querySpec: SqlQuerySpec,
  queryOptions: FeedOptions,
  containerId: string
) => {
  const container = cosmosdbClient.database("giuseppe").container(containerId);
  const {
    resources: result,
    hasMoreResults,
    continuationToken
  } = await container.items.query(querySpec, queryOptions).fetchNext();
  return { result, hasMoreResults, continuationToken };
};

/**
 * Wraps a GetProducts handler inside an Express request handler.
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function GetProducts(
  serviceModel: ServiceModel
): express.RequestHandler {
  const handler = GetProductsHandler();

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    AzureUserAttributesMiddleware(serviceModel),
    RequiredQueryParamMiddleware("items", t.string),
    RequiredQueryParamMiddleware("ctoken", t.string),
    RequiredQueryParamMiddleware("category", t.string)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
