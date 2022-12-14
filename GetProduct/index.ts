import * as express from "express";
import * as winston from "winston";

import { Context } from "@azure/functions";

import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";

import { getConfigOrThrow } from "../utils/config";
import { cosmosdbClient } from "../utils/cosmosdb";
import { GetProduct } from "./handler";

//
//  CosmosDB initialization
//

const config = getConfigOrThrow();

const servicesContainer = cosmosdbClient
  .database(config.COSMOSDB_NAME)
  .container(process.env.COSMOSDB_PRODUCTS_COLLECTION as string);

const serviceModel = new ServiceModel(servicesContainer);

// eslint-disable-next-line functional/no-let
let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug"
});
winston.add(contextTransport);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.get("/api/v1/products/:productId", GetProduct(serviceModel));

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
const httpStart = (context: Context): void => {
  logger = context.log;
  setAppContext(app, context);
  azureFunctionHandler(context);
};

export default httpStart;
