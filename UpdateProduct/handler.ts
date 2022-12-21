import * as express from "express";
import * as t from "io-ts";

import { Context } from "@azure/functions";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
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

type IUpdateProductHandler = (
  context: Context,
  productId: unknown,
  productPayload: Product
) => Promise<
  IResponseSuccessJson<any> | IResponseErrorInternal | IResponseErrorNotFound
>;

export const UpdateProductHandler = (): IUpdateProductHandler => async (
  ctx,
  productId,
  product
): Promise<IResponseSuccessJson<any>> => {
  let response = await updateProductTask(productId, product);

  return ResponseSuccessJson({
    statusCode: response
  });
};

const updateProductTask = async (
  productId: unknown,
  product: Product
): Promise<number> => {
  const container = cosmosdbClient
    .database("giuseppe")
    .container(process.env.COSMOSDB_PRODUCTS_COLLECTION as string);

  /* const item: Product = await (<Product>(
    container.item(productId as string, productId)
  ));
  const mergedItem = { ...item, ...product }; */

  const updateResponse = await container
    .item(productId as string, productId)
    .replace(product);

  console.log(updateResponse.statusCode);

  return updateResponse.statusCode;
};

/**
 * Wraps a GetProducts handler inside an Express request handler.
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function UpdateProduct(): express.RequestHandler {
  const handler = UpdateProductHandler();

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("productId", t.string),
    RequiredBodyPayloadMiddleware(Product)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
