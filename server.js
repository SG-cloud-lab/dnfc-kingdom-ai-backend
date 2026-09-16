const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const admin = require("firebase-admin");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.options("*", cors());

// ===============================
// GEMINI CONNECTION
// ===============================
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY missing");
}

const genAI =
    new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY
    );

// ===============================
// FIREBASE CONNECTION
// ===============================
const serviceAccount =
    JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );

admin.initializeApp({
    credential:
        admin.credential.cert(
            serviceAccount
        )
});

const db =
    admin.firestore();

console.log(
    "Firebase connected successfully."
);

// ===============================
// CLOUDINARY CONNECTION
// ===============================
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.error(
        "FATAL: Cloudinary environment variables are missing."
    );
}

cloudinary.config({
    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
        process.env.CLOUDINARY_API_KEY,

    api_secret:
        process.env.CLOUDINARY_API_SECRET,

    secure: true
});

console.log(
    "Cloudinary configuration loaded."
);

// ===============================
// MULTER
// ===============================
// Files are temporarily kept in memory
// before being sent to Cloudinary.
const upload =
    multer({
        storage:
            multer.memoryStorage(),

        limits: {
            fileSize:
                100 * 1024 * 1024
        }
    });

// ===============================
// CLOUDINARY UPLOAD HELPER
// ===============================
function uploadToCloudinary(
    buffer,
    options = {}
) {
    return new Promise(
        (resolve, reject) => {

            const stream =
                cloudinary.uploader.upload_stream(
                    {
                        folder:
                            options.folder ||
                            "dnfc",

                        resource_type:
                            options.resource_type ||
                            "auto",

                        ...options
                    },

                    (error, result) => {

                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(result);
                    }
                );

            stream.end(buffer);
        }
    );
}

// ===============================
// GEMINI FALLBACK SYSTEM
// ===============================
async function generateWithFallback(
    prompt
) {

    const models = [
        "gemini-3.6-flash",
        "gemini-2.5-flash"
    ];

    let lastError;

    for (
        const modelName
        of models
    ) {

        try {

            console.log(
                "Trying model:",
                modelName
            );

            const model =
                genAI.getGenerativeModel({
                    model:
                        modelName
                });

            const result =
                await model.generateContent(
                    prompt
                );

            return result.response.text();

        }

        catch (error) {

            console.log(
                modelName +
                " failed:",
                error.message
            );

            lastError = error;
        }
    }

    throw lastError;
}

// ===============================
// LOAD DNFC KNOWLEDGE LIBRARY
// ===============================
let knowledge = "";

try {

    const libraryPath =
        path.join(
            __dirname,
            "knowledge",
            "dnfc-library.txt"
        );

    const library =
        fs.readFileSync(
            libraryPath,
            "utf8"
        );

    let revelationsContent = "";

    const revelationsFolder =
        path.join(
            __dirname,
            "knowledge",
            "revelations"
        );

    if (
        fs.existsSync(
            revelationsFolder
        )
    ) {

        const files =
            fs.readdirSync(
                revelationsFolder
            );

        for (
            const file
            of files
        ) {

            if (
                file.endsWith(".txt")
            ) {

                const content =
                    fs.readFileSync(
                        path.join(
                            revelationsFolder,
                            file
                        ),
                        "utf8"
                    );

                revelationsContent +=
                    "\n\n===== " +
                    file.toUpperCase() +
                    " =====\n\n" +
                    content;
            }
        }
    }

    knowledge =
        "===== DNFC LIBRARY =====\n\n" +
        library +
        "\n\n===== DNFC REVELATIONS =====\n\n" +
        revelationsContent;

    console.log(
        "DNFC knowledge loaded successfully."
    );

}

catch (error) {

    console.error(
        "Knowledge loading error:",
        error.message
    );
}

// ===============================
// LOAD OTHER KNOWLEDGE FILES
// ===============================
let revelations = "";
let kingdomInsights = "";
let instructions = "";

try {

    revelations =
        fs.readFileSync(
            path.join(
                __dirname,
                "knowledge",
                "dnfc-revelations.txt"
            ),
            "utf8"
        );

}

catch (error) {

    console.log(
        "No revelations file loaded."
    );
}

try {

    kingdomInsights =
        fs.readFileSync(
            path.join(
                __dirname,
                "knowledge",
                "kingdom-insights",
                "kingdom-insights.txt"
            ),
            "utf8"
        );

}

catch (error) {

    console.log(
        "No kingdom insights file loaded."
    );
}

try {

    instructions =
        fs.readFileSync(
            path.join(
                __dirname,
                "dnfc-ai-instructions.txt"
            ),
            "utf8"
        );

}

catch (error) {

    console.log(
        "No AI instructions file loaded."
    );
}

// ===============================
// TEST ROUTE
// ===============================
app.get(
    "/",
    (req, res) => {

        res.send(
            "DNFC Kingdom AI Backend is Live."
        );

    }
);

// ===============================
// CLOUDINARY STATUS TEST
// ===============================
app.get(
    "/cloudinary-status",
    async (req, res) => {

        try {

            await cloudinary.api.ping();

            res.json({
                success: true,
                message:
                    "Cloudinary connection is working."
            });

        }

        catch (error) {

            console.error(
                "Cloudinary connection error:",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Cloudinary connection failed."
            });

        }
    }
);
// ===============================
// AI QUESTION ROUTE
// ===============================
app.post(
    "/ask",
    async (req, res) => {

        console.log(
            "ASK ROUTE REACHED"
        );

        const question =
            req.body.question;

        if (!question) {

            return res.status(400).json({
                error:
                    "Please provide a question"
            });

        }

        try {

            const prompt = `
You are DNFC Kingdom AI.

Your purpose is to teach according to the DNFC Kingdom AI knowledge library and instructions.

Always follow DNFC instructions first.

Use DNFC knowledge sources as the first source of truth.

Keep answers biblical, spiritual, clear and mature.

Focus on Christ, the finished work of Christ, the Holy Spirit, identity in Christ, and God's eternal purpose.

========================
DNFC AI INSTRUCTIONS:
${instructions}
========================

DNFC KNOWLEDGE:
${knowledge}
========================

DNFC REVELATIONS:
${revelations}
========================

KINGDOM INSIGHTS:
${kingdomInsights}
========================

USER QUESTION:
${question}

Give a detailed but understandable answer.
`;

            console.log(
                "Sending request to Gemini..."
            );

            const answer =
                await generateWithFallback(
                    prompt
                );

            await db
                .collection(
                    "conversations"
                )
                .add({
                    question:
                        question,

                    answer:
                        answer,

                    createdAt:
                        new Date()
                });

            res.json({
                answer:
                    answer
            });

        }

        catch (error) {

            console.error(
                "GEMINI ERROR:",
                error.message
            );

            res.status(500).json({
                error:
                    "AI Service failed",

                details:
                    error.message
            });

        }
    }
);

// ===============================
// LOAD CONVERSATIONS
// ===============================
app.get(
    "/conversations",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "conversations"
                    )
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            let conversations = [];

            snapshot.forEach(
                doc => {

                    conversations.push({
                        id:
                            doc.id,

                        ...doc.data()
                    });

                }
            );

            res.json(
                conversations
            );

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// AI DAILY DEVOTION GENERATOR
// ===============================
app.post(
    "/generate-devotions",
    async (req, res) => {

        const theme =
            req.body.theme;

        const days =
            req.body.days || 7;

        if (!theme) {

            return res.status(400).json({
                error:
                    "Please provide a devotion theme"
            });

        }

        try {

            const prompt = `
You are DNFC Kingdom AI Daily Devotion Generator.

Create ${days} daily devotions based on this theme:

${theme}

Each devotion must contain:

title
author
scripture
verseText
teaching (3-5 paragraphs)
goldenNugget
prayer
furtherStudy
theme
day

Return ONLY valid JSON.

Format:

[
{
"title":"",
"author":"Apostle Shemmy Gaviyao",
"scripture":"",
"verseText":"",
"teaching":[
"Paragraph 1",
"Paragraph 2",
"Paragraph 3"
],
"goldenNugget":"",
"prayer":"",
"furtherStudy":[
"Romans 5:17"
],
"theme":"",
"day":1
}
]

DNFC AI INSTRUCTIONS:

${instructions}

DNFC KNOWLEDGE:

${knowledge}

DNFC REVELATIONS:

${revelations}

KINGDOM INSIGHTS:

${kingdomInsights}
`;

            const text =
                await generateWithFallback(
                    prompt
                );

            const cleanJSON =
                text
                    .replace(
                        /```json/g,
                        ""
                    )
                    .replace(
                        /```/g,
                        ""
                    )
                    .trim();

            const devotions =
                JSON.parse(
                    cleanJSON
                );

            for (
                const devotion
                of devotions
            ) {

                await db
                    .collection(
                        "daily-devotions-drafts"
                    )
                    .add({
                        ...devotion,

                        status:
                            "draft",

                        createdAt:
                            new Date()
                    });

            }

            res.json({
                message:
                    "Devotions generated successfully",

                count:
                    devotions.length
            });

        }

        catch (error) {

            console.error(
                "Devotion generator error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// GET DEVOTION DRAFTS
// ===============================
app.get(
    "/daily-devotions-drafts",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "daily-devotions-drafts"
                    )
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            let drafts = [];

            snapshot.forEach(
                doc => {

                    drafts.push({
                        id:
                            doc.id,

                        ...doc.data()
                    });

                }
            );

            res.json(
                drafts
            );

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// GET SINGLE DRAFT
// ===============================
app.get(
    "/daily-devotions-drafts/:id",
    async (req, res) => {

        try {

            const doc =
                await db
                    .collection(
                        "daily-devotions-drafts"
                    )
                    .doc(
                        req.params.id
                    )
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    error:
                        "Draft not found"
                });

            }

            res.json({
                id:
                    doc.id,

                ...doc.data()
            });

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// APPROVE AND PUBLISH DEVOTION
// ===============================
app.patch(
    "/daily-devotions-drafts/:id/approve",
    async (req, res) => {

        try {

            const draftDoc =
                await db
                    .collection(
                        "daily-devotions-drafts"
                    )
                    .doc(
                        req.params.id
                    )
                    .get();

            if (!draftDoc.exists) {

                return res.status(404).json({
                    error:
                        "Draft not found"
                });

            }

            const devotion =
                draftDoc.data();

            await db
                .collection(
                    "daily-devotions"
                )
                .add({
                    ...devotion,

                    status:
                        "published",

                    publishDate:
                        req.body.publishDate ||
                        devotion.publishDate ||
                        new Date(),

                    approvedAt:
                        new Date()
                });

            await db
                .collection(
                    "daily-devotions-drafts"
                )
                .doc(
                    req.params.id
                )
                .delete();

            res.json({
                message:
                    "Devotion approved successfully"
            });

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// UPDATE DAILY DEVOTION DRAFT
// ===============================
app.patch(
    "/daily-devotions-drafts/:id",
    async (req, res) => {

        try {

            await db
                .collection(
                    "daily-devotions-drafts"
                )
                .doc(
                    req.params.id
                )
                .update(
                    req.body
                );

            res.json({
                message:
                    "Devotion updated successfully"
            });

        }

        catch (error) {

            console.log(
                error
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// GET SINGLE PUBLISHED DEVOTION
// ===============================
app.get(
    "/daily-devotions/:id",
    async (req, res) => {

        try {

            const doc =
                await db
                    .collection(
                        "daily-devotions"
                    )
                    .doc(
                        req.params.id
                    )
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    error:
                        "Devotion not found"
                });

            }

            res.json({
                id:
                    doc.id,

                ...doc.data()
            });

        }

        catch (error) {

            console.error(
                "Single devotion error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// GET PUBLISHED DEVOTIONS
// AUTOMATIC DAILY RELEASE SYSTEM
// ===============================
app.get(
    "/daily-devotions",
    async (req, res) => {

        try {

            const today =
                new Date();

            const snapshot =
                await db
                    .collection(
                        "daily-devotions"
                    )
                    .where(
                        "status",
                        "==",
                        "published"
                    )
                    .get();

            let devotions = [];

            snapshot.forEach(
                doc => {

                    const data =
                        doc.data();

                    let publishDate =
                        null;

                    if (
                        data.publishDate
                    ) {

                        if (
                            typeof data.publishDate.toDate ===
                            "function"
                        ) {

                            publishDate =
                                data.publishDate.toDate();

                        }

                        else if (
                            data.publishDate.seconds
                        ) {

                            publishDate =
                                new Date(
                                    data.publishDate.seconds *
                                    1000
                                );

                        }

                        else {

                            publishDate =
                                new Date(
                                    data.publishDate
                                );

                        }

                    }

                    if (
                        !publishDate ||
                        publishDate <= today
                    ) {

                        devotions.push({
                            id:
                                doc.id,

                            ...data
                        });

                    }

                }
            );

            devotions.sort(
                (a, b) => {

                    const dateA =
                        a.publishDate?.seconds
                        ?
                        a.publishDate.seconds
                        :
                        0;

                    const dateB =
                        b.publishDate?.seconds
                        ?
                        b.publishDate.seconds
                        :
                        0;

                    return dateB - dateA;

                }
            );

            res.json(
                devotions
            );

        }

        catch (error) {

            console.error(
                "Published devotion error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// ADMIN VIEW ALL PUBLISHED
// ===============================
app.get(
    "/admin/published-devotions",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "daily-devotions"
                    )
                    .orderBy(
                        "approvedAt",
                        "desc"
                    )
                    .get();

            const now =
                new Date();

            let devotions = [];

            snapshot.forEach(
                doc => {

                    const data =
                        doc.data();

                    let publishDate =
                        null;

                    if (
                        data.publishDate &&
                        typeof data.publishDate.toDate ===
                        "function"
                    ) {

                        publishDate =
                            data.publishDate.toDate();

                    }

                    else if (
                        data.publishDate &&
                        data.publishDate.seconds
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate.seconds *
                                1000
                            );

                    }

                    else if (
                        data.publishDate
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate
                            );

                    }

                    if (
                        publishDate &&
                        !isNaN(
                            publishDate.getTime()
                        ) &&
                        publishDate > now
                    ) {

                        return;

                    }

                    devotions.push({
                        id:
                            doc.id,

                        ...data
                    });

                }
            );

            res.json(
                devotions
            );

        }

        catch (error) {

            console.error(
                "Admin published devotion error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// DELETE PUBLISHED DEVOTION
// ===============================
app.delete(
    "/daily-devotions/:id",
    async (req, res) => {

        try {

            await db
                .collection(
                    "daily-devotions"
                )
                .doc(
                    req.params.id
                )
                .delete();

            res.json({
                message:
                    "Devotion deleted successfully"
            });

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);
// ===============================
// ADMIN VIEW ALL PUBLISHED
// ===============================
app.get(
    "/admin/published-devotions",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "daily-devotions"
                    )
                    .orderBy(
                        "approvedAt",
                        "desc"
                    )
                    .get();

            const now =
                new Date();

            let devotions = [];

            snapshot.forEach(
                doc => {

                    const data =
                        doc.data();

                    let publishDate =
                        null;

                    if (
                        data.publishDate &&
                        typeof data.publishDate.toDate ===
                        "function"
                    ) {

                        publishDate =
                            data.publishDate.toDate();

                    }

                    else if (
                        data.publishDate &&
                        data.publishDate.seconds
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate.seconds *
                                1000
                            );

                    }

                    else if (
                        data.publishDate
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate
                            );

                    }

                    if (
                        publishDate &&
                        !isNaN(
                            publishDate.getTime()
                        ) &&
                        publishDate > now
                    ) {

                        return;

                    }

                    devotions.push({
                        id:
                            doc.id,

                        ...data
                    });

                }
            );

            res.json(
                devotions
            );

        }

        catch (error) {

            console.error(
                "Admin published devotion error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// DELETE PUBLISHED DEVOTION
// ===============================
app.delete(
    "/daily-devotions/:id",
    async (req, res) => {

        try {

            await db
                .collection(
                    "daily-devotions"
                )
                .doc(
                    req.params.id
                )
                .delete();

            res.json({
                message:
                    "Devotion deleted successfully"
            });

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// MANUAL PUBLISH UPDATE
// ===============================
app.patch(
    "/daily-devotions/:id/publish",
    async (req, res) => {

        try {

            await db
                .collection(
                    "daily-devotions"
                )
                .doc(
                    req.params.id
                )
                .update({
                    status:
                        "published",

                    publishDate:
                        new Date(),

                    publishedAt:
                        new Date()
                });

            res.json({
                message:
                    "Devotion published successfully"
            });

        }

        catch (error) {

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);
// ======================================================
// DNFC CONTENT ENGINE
// ======================================================

// ===============================
// UPLOAD CONTENT
// ===============================
app.post(
    "/content",
    upload.fields([
        {
            name: "media",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),

    async (req, res) => {

        try {

            const {
                title,
                speaker,
                description,
                category,
                language,
                mediaType,
                placement,
                publishMode,
                publishDate
            } = req.body;

            if (!title) {

                return res.status(400).json({
                    error:
                        "Content title is required."
                });

            }

            // ===============================
// MEDIA SOURCE VALIDATION
// ===============================

const youtubeUrl =
    req.body.youtubeUrl || "";

const mediaFile =
    req.files &&
    req.files.media &&
    req.files.media[0];


// VIDEO CONTENT
// Videos now use YouTube instead of
// uploading the video file to Cloudinary.

if (mediaType === "video") {

    if (!youtubeUrl.trim()) {

        return res.status(400).json({
            error:
                "YouTube video URL is required."
        });

    }

}


// AUDIO CONTENT
// Audio files are still uploaded
// normally through Cloudinary.

if (mediaType === "audio") {

    if (!mediaFile) {

        return res.status(400).json({
            error:
                "Audio media file is required."
        });

    }

}

            // ===============================
// UPLOAD MEDIA TO CLOUDINARY
// ===============================

let mediaUpload = null;

if (mediaType === "audio") {

    mediaUpload =
        await uploadToCloudinary(
            mediaFile.buffer,
            {
                folder:
                    "dnfc/media",

                resource_type:
                    "auto"
            }
        );

}

            // ===============================
            // UPLOAD THUMBNAIL
            // ===============================
            let thumbnailUpload =
                null;

            if (
                req.files.thumbnail &&
                req.files.thumbnail[0]
            ) {

                thumbnailUpload =
                    await uploadToCloudinary(
                        req.files.thumbnail[0].buffer,
                        {
                            folder:
                                "dnfc/thumbnails",

                            resource_type:
                                "image"
                        }
                    );

            }

            // ===============================
            // PUBLICATION TIME
            // ===============================
            let finalPublishDate =
                null;

            if (
                publishMode === "now"
            ) {

                finalPublishDate =
                    new Date();

            }

            else if (
                publishDate
            ) {

                finalPublishDate =
                    new Date(
                        publishDate
                    );

            }

            // ===============================
            // CONTENT STATUS
            // ===============================
            const now =
                new Date();

            const contentStatus =
                finalPublishDate &&
                finalPublishDate > now
                ?
                "scheduled"
                :
                "published";

            // ===============================
            // SAVE CONTENT TO FIRESTORE
            // ===============================
                            const contentData = {

    title:
        title,

    speaker:
        speaker ||
        "Shemmy Gaviyao",

    description:
        description ||
        "",

    category:
        category ||
        "Sermon / Teaching",

    language:
        language ||
        "English",

    mediaType:
        mediaType ||
        "audio",

    placement:
        placement ||
        "",

    // AUDIO = Cloudinary
    // VIDEO = YouTube

    mediaUrl:
        mediaType === "video"
            ? youtubeUrl
            : mediaUpload
                ? mediaUpload.secure_url
                : "",

    mediaPublicId:
        mediaUpload
            ? mediaUpload.public_id
            : "",

    mediaResourceType:
        mediaUpload
            ? mediaUpload.resource_type
            : "",

    // Keep YouTube URL separately
    // for video content.

    youtubeUrl:
        mediaType === "video"
            ? youtubeUrl
            : "",

    thumbnailUrl:
        thumbnailUpload
            ?
            thumbnailUpload.secure_url
            :
            "",

    thumbnailPublicId:
        thumbnailUpload
            ?
            thumbnailUpload.public_id
            :
            "",

    status:
        contentStatus,

    publishDate:
        finalPublishDate ||
        now,

    createdAt:
        now,

    updatedAt:
        now
};

// ===============================
// GET PUBLISHED CONTENT
// ===============================
app.get(
    "/content",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "content"
                    )
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            const now =
                new Date();

            let content = [];

            snapshot.forEach(
                doc => {

                    const data =
                        doc.data();

                    let publishDate =
                        null;

                    if (
                        data.publishDate &&
                        typeof data.publishDate.toDate ===
                        "function"
                    ) {

                        publishDate =
                            data.publishDate.toDate();

                    }

                    else if (
                        data.publishDate &&
                        data.publishDate.seconds
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate.seconds *
                                1000
                            );

                    }

                    else if (
                        data.publishDate
                    ) {

                        publishDate =
                            new Date(
                                data.publishDate
                            );

                    }

                    // ===============================
                    // HIDE FUTURE CONTENT
                    // ===============================
                    if (
                        publishDate &&
                        publishDate > now
                    ) {

                        return;

                    }

                    content.push({

                        id:
                            doc.id,

                        ...data

                    });

                }
            );

            res.json(
                content
            );

        }

        catch (error) {

            console.error(
                "Content loading error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// GET SINGLE CONTENT
// ===============================
app.get(
    "/content/:id",
    async (req, res) => {

        try {

            const doc =
                await db
                    .collection(
                        "content"
                    )
                    .doc(
                        req.params.id
                    )
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    error:
                        "Content not found."
                });

            }

            res.json({

                id:
                    doc.id,

                ...doc.data()

            });

        }

        catch (error) {

            console.error(
                "Single content error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// ADMIN VIEW ALL CONTENT
// ===============================
app.get(
    "/admin/content",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection(
                        "content"
                    )
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            let content = [];

            snapshot.forEach(
                doc => {

                    content.push({

                        id:
                            doc.id,

                        ...doc.data()

                    });

                }
            );

            res.json(
                content
            );

        }

        catch (error) {

            console.error(
                "Admin content loading error:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);

// ===============================
// DELETE CONTENT
// ===============================
app.delete(
    "/content/:id",
    async (req, res) => {

        try {

            const doc =
                await db
                    .collection(
                        "content"
                    )
                    .doc(
                        req.params.id
                    )
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    error:
                        "Content not found."
                });

            }

            const data =
                doc.data();

            // ===============================
            // DELETE MEDIA FROM CLOUDINARY
            // ===============================
            if (
                data.mediaPublicId
            ) {

                try {

                    await cloudinary
                        .uploader
                        .destroy(
                            data.mediaPublicId,
                            {
                                resource_type:
                                    data.mediaResourceType ||
                                    "video"
                            }
                        );

                }

                catch (
                    cloudinaryError
                ) {

                    console.error(
                        "Cloudinary media deletion error:",
                        cloudinaryError.message
                    );

                }

            }

            // ===============================
            // DELETE THUMBNAIL
            // ===============================
            if (
                data.thumbnailPublicId
            ) {

                try {

                    await cloudinary
                        .uploader
                        .destroy(
                            data.thumbnailPublicId,
                            {
                                resource_type:
                                    "image"
                            }
                        );

                }

                catch (
                    cloudinaryError
                ) {

                    console.error(
                        "Cloudinary thumbnail deletion error:",
                        cloudinaryError.message
                    );

                }

            }

            // ===============================
            // DELETE FIRESTORE RECORD
            // ===============================
            await db
                .collection(
                    "content"
                )
                .doc(
                    req.params.id
                )
                .delete();

            res.json({

                success:
                    true,

                message:
                    "Content deleted successfully."

            });

        }

        catch (error) {

            console.error(
                "Content deletion error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }
    }
);

// ===============================
// SERVER START
// ===============================
const PORT =
    process.env.PORT ||
    10000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "DNFC Kingdom AI Server running on port " +
            PORT
        );

    }
);
