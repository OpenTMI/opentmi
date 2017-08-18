# User API

## Fetch list of users
Returns the names of all the users registered to openTMI

* ##### URL
  /api/v0/users

* ##### Method:  
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**  
    ```json
    [{name: 'matti', ...},, ...]
    ```

* ##### Error Response:
  * **Code:** 401 UNAUTHORIZED  
    **Content:**  
    ```json
    { "message": "No authorization token was found" }
    ```

* ##### Sample Call:
	`curl http://localhost:3000/api/v0/users`

* ##### Notes:
  _This is available only for admins_

## Fetch User
 Returns the User information of a specific user in openTMI.

* ##### URL
  /api/v0/user/:User

* ##### Method:
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**
    ```json
    {
      _id: 5996c1858d4070a909849027,
      name: 'Test User',
      email: 'newtestermail@fakemail.se',
      displayName: 'Tester',
      apikeys: [],
      groups: [],
      loggedIn: false,
      lastVisited: 2017-08-18T10:29:25.564Z,
      registered: 2017-08-18T10:29:25.564Z 
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
    {"error": "No user found with name: X"}
    ```

* ##### Sample Call:
  `curl http://localhost:3000/api/v0/Users/matti`

* ##### Notes:
  _Require authenticated user_
  
## Fetch User settings
Returns the User settings of a specific user in openTMI. 
Settings are separated by Namespace, where namespace is client application identification, e.g. `default-gui`.
Content of settings is not restricted by openTMI.

* ##### URL
  /api/v0/user/:User/settings/:Namespace

* ##### Method:
  `GET`

* ##### Success Response:
  * **Code:** 200  
    **Content:**
    ```json
    {
      ... 
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
    {"error": "No setting found with name: X"}
    ```

* ##### Sample Call:
  `curl http://localhost:3000/api/v0/useres/matti/settings/default-gui`

* ##### Notes:
  _Require authenticated user_
  
## Fetch user apikeys
```
GET /api/v0/users/:User/apikeys
```

## Fetch Get new apikey
```
GET /api/v0/users/:User/apikeys/new
```
## Fetch Delete apikey
```
DELETE /api/v0/users/:User/apikeys/:Key
```  