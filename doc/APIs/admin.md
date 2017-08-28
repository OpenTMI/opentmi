# Admin API

## Get version
Returns the currently running version of the server

* ##### URL
  /api/v0/version

* ##### Method:
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**  
    ```json
    {
    	"name":	"OpenTMI",
		"version": "0.2.0",
		"dependencies": {
        	"bluebird": {	
				"version":  "3.5.0",
				"from": "bluebird@3.5.0",
				"resolved": "https://registry.npmjs.org/bluebird/-/bluebird-3.5.0.tgz"
            },
            "mongoose": {
            	"version": "4.11.5",
				"from":	"mongoose@>=4.11.3 <5.0.0",
				"resolved":	"https://registry.npmjs.org/mongoose/-/mongoose-4.11.5.tgz"
            },    
        }
    }
    ```

* ##### Error Response:
  * **Code:** 401 UNAUTHORIZED  
    **Content:**  
    ```json
    {"message": "No authorization token was found"}
    ```

  * **Code:** 500 INTERNAL SERVER ERROR  
    **Content:**
    ```json
    {
        "message": "some error message",
        "error": "serialized error"
    }
    ```

## Post version
Post a new version for the server. The server will try to update to the provided version

* ##### URL
  /api/v0/version

* ##### Method:
  `POST`

* ##### Data Params:

  * **Required:**

    <table>
    <thead>
    <th>Property</th>
    <th>Description</th>
    </thead>
    <trow>
    <td>revision</td>
    <td>github commit hash or some other checkout identifier</td>
    </trow>
    </table>
  
  * **Example:**
    ```json
    {
        "revision": "7d1b31e74ee336d15cbd21741bc88a537ed063a0"
    }
    ```

* ##### Success Response:
  * **Code:** 204 NO CONTENT

* ##### Error Response:
  * **Code:** 401 UNAUTHORIZED  
    **Content:**  
    ```json
    {"message": "No authorization token was found"}
    ```

  * **Code:** 403 FORBIDDEN  
    **Content:**
    ```json
    {"message": "Invalid or missing revision"}
    ```

  * **Code:** 500 INTERNAL SERVER ERROR  
    **Content:**
    ```json
    {"message": "Update failed: some reason here"}
    ```
    
    
## Restart server
Starts the restart sequence

* ##### URL  
  /api/v0/restart
  
* ##### Method:  
  `POST`
  
* ##### Success Response:
  * **Code:** 204 NO CONTENT

* ##### Error Response:  
  * **Code:** 401 UNAUTHORIZED:  
    **Content:**  
    ```json
    {"message": "No authorization token was found"}
    ```
    
  * **Code:** 500 INTERNAL SERVER ERROR:  
    **Content**  
    ```json
    {"message": "some internal error"}
    ```