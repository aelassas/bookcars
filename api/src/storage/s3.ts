import {PutObjectCommandInput, S3} from "@aws-sdk/client-s3";

const s3Client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: process.env.SPACES_ENDPOINT,
    region: process.env.SPACES_REGION,
    credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET
    }
});

export {s3Client};


import {PutObjectCommand} from "@aws-sdk/client-s3";

// Specifies a path within your bucket and the file to upload.
import mime from 'mime-types';

// Uploads the specified file to the chosen path.
export const put = async (input: Pick<PutObjectCommandInput, 'Key' | 'Body'>) => {

    const bucketParams: PutObjectCommandInput = {
        Bucket: process.env.SPACES_BUCKET,
        Key: [process.env.SPACES_FOLDER, input.Key].filter(Boolean).join('/'),
        Body: input.Body,
        ACL: 'public-read',
        ContentType: mime.lookup(input.Key ?? '') || 'application/octet-stream'
    };

    try {
        await s3Client.send(new PutObjectCommand(bucketParams));
        return `https://${process.env.SPACES_BUCKET}.${process.env.SPACES_ENDPOINT.replace(/^https:\/\//,'')}/${bucketParams.Key}`;
    } catch (err) {
        console.log("Error", err);
    }
};
