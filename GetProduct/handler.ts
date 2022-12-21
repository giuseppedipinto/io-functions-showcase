import * as express from "express";
import * as t from "io-ts";

import { Context } from "@azure/functions";
import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { cosmosdbClient } from "../utils/cosmosdb";

type IGetProductHandler = (
  context: Context,
  productId: unknown
) => Promise<
  IResponseSuccessJson<IGetProductHandlerResult> | IResponseErrorNotFound
>;

type IGetProductHandlerResult = {
  readonly result: Object;
};

export const GetProductHandler = (): IGetProductHandler => async (
  ctx,
  productId
): Promise<IResponseSuccessJson<IGetProductHandlerResult>> => {
  let response = await getProductByProductId(<string>productId);

  return ResponseSuccessJson({
    result: response
  });
};

const getProductByProductId = async (productId: string): Promise<Object> => {
  const container = cosmosdbClient
    .database("giuseppe")
    .container(process.env.COSMOSDB_PRODUCTS_COLLECTION as string);

  const { resource } = await container.item(productId, productId).read();
  return resource;
};

/**
 * Wraps a GetProducts handler inside an Express request handler.
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function GetProduct(serviceModel: ServiceModel): express.RequestHandler {
  const handler = GetProductHandler();

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("productId", t.string)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
