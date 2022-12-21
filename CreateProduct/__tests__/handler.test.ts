/* tslint:disable: no-any */

import { GetProductsHandler } from "../handler";

describe("GetProductsHandler", () => {
  it("should return a string when the query parameter is provided", async () => {
    const response = await GetProductsHandler()(
      {} as any,
      {} as any,
      "param",
      "10",
      "",
      ""
    );
    expect(response.kind).toBe("IResponseSuccessJson");
  });
});
