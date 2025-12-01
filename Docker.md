Created the Dockerfile and to build:

    podman run build .

That creates output with the last part having the image id:

    STEP 10/10: CMD [ "ng", "serve" ]
    --> Using cache bef5f98d1bd5c7c130192f47c219d22c8cf67d39b2ddeec147d0caeb9024c041
    --> bef5f98d1bd5
    bef5f98d1bd5c7c130192f47c219d22c8cf67d39b2ddeec147d0caeb9024c041

To run and expose port 4200 on the client:

    podman run -p 4200:4200 bef5f98d1bd5

To run with shell INSTEAD of command:

    podman run -ti --entrypoint=sh 77db7359cbae