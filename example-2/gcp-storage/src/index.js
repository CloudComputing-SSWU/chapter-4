const express = require("express");
const { Storage } = require('@google-cloud/storage');

const app = express();


//
// Extracts environment variables to globals for convenience.
//

const PORT = process.env.PORT;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_KEYFILE_PATH = process.env.GCP_KEYFILE_PATH;
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME;

console.log(`Serving videos from GCP Bucket: ${GCP_BUCKET_NAME}.`);

//
// Throws an error if any required environment variables are missing.
//

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}


if (!process.env.GCP_PROJECT_ID) {
    throw new Error("Please specify your Google Cloud Project ID in environment variable GCP_PROJECT_ID.");
}

if (!process.env.GCP_KEYFILE_PATH) {
    throw new Error("Please specify the path to your GCP key file in environment variable GCP_KEYFILE_PATH.");
}

if (!process.env.GCP_BUCKET_NAME) {
    throw new Error("Please specify the name of your GCP storage bucket in environment variable GCP_BUCKET_NAME.");
}

//
// Creates the Storage service API client to communicate with GCP storage.
//
function createStorageClient() {
    const storage = new Storage({
        projectId: GCP_PROJECT_ID,
        keyFilename: GCP_KEYFILE_PATH,
    });
    return storage;
}

//
// Registers a HTTP GET route to retrieve videos from storage.
//
app.get("/video", (req, res) => {

    const videoPath = req.query.path;
    console.log(`Streaming video from path ${videoPath}.`);

    const storage = createStorageClient();
    const bucket = storage.bucket(GCP_BUCKET_NAME);

    bucket.file(videoPath).getMetadata((err, metadata) => {
        if (err) {
            console.error(`Error occurred getting properties for video ${GCP_BUCKET_NAME}/${videoPath}.`);
            console.error(err && err.stack || err);
            res.sendStatus(500);
            return;
        }

        //
        // Writes HTTP headers to the response.
        //
        res.writeHead(200, {
            "Content-Length": metadata.size,
            "Content-Type": "video/mp4",
        });

        //
        // Streams the video from GCP storage to the response.
        //
        bucket.file(videoPath).createReadStream().on('error', err => {
            console.error(`Error occurred getting video ${GCP_BUCKET_NAME}/${videoPath} to stream.`);
            console.error(err && err.stack || err);
            res.sendStatus(500);
        }).pipe(res);
    });
});

app.listen(PORT, () => {
    console.log(`Microservice online`);
});

