# Schema API

## Fetch Schema Names
Returns the names of all the schemas currently available in openTMI

* ##### URL
  /api/v0/schemas

* ##### Method:  
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**  
    ```json
    ["ApiKey", "File", "Build", "Campaign", "Group", "Item", "Loan",
     "Resource", "Result", "Target", "Testcase", "User"]
    ```

* ##### Error Response:
  * **Code:** 401 UNAUTHORIZED  
    **Content:**  
    ```json
    { "message": "No authorization token was found" }
    ```

* ##### Sample Call:
	`curl http://localhost:3000/api/v0/schemas`

* ##### Notes:
  _..._

## Fetch Schema
 Returns the schema information of a specific model in openTMI.  
 Provided schema is is JSON Schema format( http://json-schema.org/ ).

* ##### URL
  /api/v0/schemas/:collection

* ##### Method:
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**
    ```json
    {
      "collection": "Item",
      "schema": {
        "type": "object",
        "properties": {
          "barcode": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "name",
        ]
      },
      "properties": [
        "barcode",
        "name",
      ]
    }
    ```

* ##### Error Response:
  * **Code:** 401 UNAUTHORIZED  
    **Content:**
    ```json
    { "message": "No authorization token was found" }
    ```

  * **Code:** 404 NOT FOUND  
    **Content:**
    ```json
    {"error": "No schema found with name: UndefinedScema"}
    ```

* ##### Sample Call:
  `curl http://localhost:3000/api/v0/schemas/Item`

* ##### Notes:
  _..._