import * as express from "express";
import * as t from "io-ts";

import { Context } from "@azure/functions";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { cosmosdbClient } from "../utils/cosmosdb";
import { Product } from "../generated/definitions/Product";

type ICreateProductHandler = (
  context: Context,
  productPayload: Product
) => Promise<
  IResponseSuccessJson<any> | IResponseErrorInternal | IResponseErrorNotFound
>;

export const CreateProductHandler = (): ICreateProductHandler => async (
  ctx,
  product
): Promise<IResponseSuccessJson<any>> => {
  let response = await createProductTask(product);

  return ResponseSuccessJson({
    statusCode: response
  });
};

const createProductTask = async (product: Product): Promise<number> => {
  const container = cosmosdbClient
    .database("giuseppe")
    .container(process.env.COSMOSDB_PRODUCTS_COLLECTION as string);

  const createResponse = await container.items.create(product);
  console.log(createResponse.statusCode);

  return createResponse.statusCode;
};

/**
 * Wraps a GetProducts handler inside an Express request handler.
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function CreateProduct(): express.RequestHandler {
  const handler = CreateProductHandler();

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(Product)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
