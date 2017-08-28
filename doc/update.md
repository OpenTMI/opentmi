# Server update

OpenTMI server can be updated remotely to different versions without downtime (see cluster.md for details on how this happens on a distributed perspective). How the update is done depends on how the server is installed. If the server has a `.git` folder it is updated via specific github commits. If no `.git` folder is found the server is updated through npm.

Update can be triggered with a `POST` call to the `/api/v0/version` route.

Note! Update without downtime is only possible when clustering is activated and update does not change how workers are handled by the master process. Update can also be performed in these cases but it does require a complete server restart.

## Github update

Github update follows a pipeline
1. Check current server directory sanity (untracked files, etc...) `git diff --quiet HEAD`
2. If server directory has been modified perform a reset `git reset --hard`
3. Clean workspace `git clean -f -d`
4. Checkout revision `git checkout SOME_REVISION`
5. Install dependencies `npm install`

## Npm update

Not yet implemented

## On Update Failure

If update fails for some reason OpenTMI attempts to revert back to the previous version (Not yet implemented)