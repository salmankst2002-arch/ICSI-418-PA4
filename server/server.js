

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 9000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "Project02";

let users;
let projects;
let projectMemberships;
let userStories;

const priorities = ["High", "Medium", "Low"];
const storyStatuses = ["To Do", "In Progress", "Done"];
const projectStatuses = ["Planning", "Active", "Completed"];

const idRegex = /^[0-9a-fA-F]{24}$/;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function validId(value) {
    return typeof value === "string" && idRegex.test(value);
}

function nonblank(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function asyncRoute(handler) {
    return (req, res, next) =>
        Promise.resolve(handler(req, res)).catch(next);
}

function validateStory(data) {
    if (!nonblank(data.title) || !nonblank(data.description)) {
        return "Title and description are required.";
    }

    if (
        !/^As (a|an) .+?,\s*I want .+?,\s*so that .+/i.test(
            data.description.trim()
        )
    ) {
        return 'Description must follow: "As a [user], I want [goal], so that [benefit]."';
    }

    if (!priorities.includes(data.priority)) {
        return "Priority must be High, Medium, or Low.";
    }

    if (!storyStatuses.includes(data.status)) {
        return "Status must be To Do, In Progress, or Done.";
    }

    return null;
}

async function getProject(projectId, res) {
    if (!validId(projectId)) {
        res.status(400).json({
            message: "Invalid project ID."
        });
        return null;
    }

    const project = await projects.findOne({
        _id: new ObjectId(projectId)
    });

    if (!project) {
        res.status(404).json({
            message: "Project not found."
        });
        return null;
    }

    return project;
}

async function validateAssignedMember(projectId, assignedUserId) {
    if (
        assignedUserId === null ||
        assignedUserId === "" ||
        assignedUserId === undefined
    ) {
        return { value: null };
    }

    if (!validId(assignedUserId)) {
        return {
            error: "Invalid assigned member ID."
        };
    }

    const userId = new ObjectId(assignedUserId);

    const [user, membership] = await Promise.all([
        users.findOne({
            _id: userId
        }),

        projectMemberships.findOne({
            project_id: new ObjectId(projectId),
            user_id: userId
        })
    ]);

    if (!user || !membership) {
        return {
            error: "Assigned user must be a current member of this project."
        };
    }

    return { value: userId };
}

async function withAssignedName(story) {
    let name = "Unassigned";

    if (story.assigned_user_id) {
        const user = await users.findOne({
            _id: story.assigned_user_id
        });

        name = user
            ? (user.username || user.name || user.email || "Unknown")
            : "Unknown";
    }

    return {
        ...story,
        assigned_user_name: name,
        assigned_member_name: name
    };
}

// =====================================================
// SERVER HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

// =====================================================
// PA2: USER SIGNUP
// =====================================================

app.post("/signup", asyncRoute(async (req, res) => {
    const { username, name, email, password } = req.body || {};

    const usernameToUse = username || name;

    if (
        !nonblank(usernameToUse) ||
        !nonblank(email) ||
        !nonblank(password)
    ) {
        return res.status(400).json({
            message: "Username, email, and password are required."
        });
    }

    const existing = await users.findOne({
        $or: [
            { username: usernameToUse.trim() },
            { email: email.trim() }
        ]
    });

    if (existing) {
        return res.status(409).json({
            message: "Username or email already exists."
        });
    }

    const result = await users.insertOne({
        username: usernameToUse.trim(),
        email: email.trim(),
        password
    });

    return res.status(201).json({
        message: "Signup successful!",
        user: {
            id: result.insertedId,
            username: usernameToUse.trim(),
            email: email.trim()
        }
    });
}));

// =====================================================
// PA2: USER LOGIN
// =====================================================

app.post("/login", asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};

    if (!nonblank(email) || !nonblank(password)) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    const user = await users.findOne({
        email: email.trim()
    });

    if (!user || user.password !== password) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    return res.json({
        message: "Login successful!",
        user: {
            id: user._id,
            username: user.username || user.name || user.email,
            email: user.email
        }
    });
}));

// =====================================================
// GET REGISTERED USERS
// =====================================================

app.get("/users", asyncRoute(async (req, res) => {
    const allUsers = await users
        .find({}, {
            projection: {
                username: 1,
                name: 1
            }
        })
        .toArray();

    res.json(
        allUsers.map(user => ({
            _id: user._id,
            username: user.username || user.name || "Unknown"
        }))
    );
}));

// =====================================================
// PA3: CREATE PROJECT
// =====================================================

app.post("/projects", asyncRoute(async (req, res) => {
    const {
        name,
        description,
        status,
        project_lead_id
    } = req.body || {};

    if (
        !nonblank(name) ||
        !nonblank(description) ||
        !projectStatuses.includes(status) ||
        !validId(project_lead_id)
    ) {
        return res.status(400).json({
            message: "Please provide valid project information."
        });
    }

    const leadId = new ObjectId(project_lead_id);

    const lead = await users.findOne({
        _id: leadId
    });

    if (!lead) {
        return res.status(404).json({
            message: "Selected project lead does not exist."
        });
    }

    const project = {
        name: name.trim(),
        description: description.trim(),
        status,
        project_lead_id: leadId
    };

    const result = await projects.insertOne(project);

    try {
        await projectMemberships.insertOne({
            project_id: result.insertedId,
            user_id: leadId
        });
    } catch (error) {
        await projects.deleteOne({
            _id: result.insertedId
        });

        throw error;
    }

    return res.status(201).json({
        message: "Project created successfully!",
        project: {
            ...project,
            _id: result.insertedId
        }
    });
}));

// =====================================================
// PA3: VIEW PROJECTS
// =====================================================

app.get("/projects", asyncRoute(async (req, res) => {
    const allProjects = await projects.find().toArray();

    const output = await Promise.all(
        allProjects.map(async project => {
            const lead = await users.findOne({
                _id: project.project_lead_id
            });

            return {
                ...project,
                project_lead_name: lead
                    ? (lead.username || lead.name || lead.email)
                    : "Unknown"
            };
        })
    );

    res.json(output);
}));

// =====================================================
// PA3: VIEW PROJECT MEMBERS
// =====================================================

app.get(
    "/projects/:projectId/members",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        const memberships = await projectMemberships
            .find({
                project_id: project._id
            })
            .toArray();

        const result = await Promise.all(
            memberships.map(async membership => {
                const user = await users.findOne({
                    _id: membership.user_id
                });

                return {
                    user_id: membership.user_id,
                    username: user
                        ? (user.username || user.name || user.email)
                        : "Unknown",
                    isLead:
                        String(membership.user_id) ===
                        String(project.project_lead_id)
                };
            })
        );

        return res.json(result);
    })
);

// =====================================================
// PA3: ADD PROJECT MEMBER
// =====================================================

app.post(
    "/projects/:projectId/members",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        const { user_id } = req.body || {};

        if (!validId(user_id)) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        const userId = new ObjectId(user_id);

        const user = await users.findOne({
            _id: userId
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const existing = await projectMemberships.findOne({
            project_id: project._id,
            user_id: userId
        });

        if (existing) {
            return res.status(409).json({
                message: "User is already a member of this project."
            });
        }

        try {
            await projectMemberships.insertOne({
                project_id: project._id,
                user_id: userId
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "User is already a member of this project."
                });
            }

            throw error;
        }

        return res.status(201).json({
            message: "Member added successfully!"
        });
    })
);

// =====================================================
// PA3 + PA4: REMOVE PROJECT MEMBER
// =====================================================

app.delete(
    "/projects/:projectId/members/:userId",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        const { userId } = req.params;

        if (!validId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        const userObjectId = new ObjectId(userId);

        const user = await users.findOne({
            _id: userObjectId
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // The project lead cannot be removed.
        if (
            String(project.project_lead_id) ===
            userId.toLowerCase()
        ) {
            return res.status(403).json({
                message: "The project lead cannot be removed."
            });
        }

        const membership = await projectMemberships.findOne({
            project_id: project._id,
            user_id: userObjectId
        });

        if (!membership) {
            return res.status(404).json({
                message: "User is not a member of this project."
            });
        }

        // PA4 Rule:
        // A member cannot be removed while stories are
        // assigned to them in this project.
        // This includes stories with Done status.

        const assignedStory = await userStories.findOne({
            project_id: project._id,
            assigned_user_id: userObjectId
        });

        if (assignedStory) {
            return res.status(409).json({
                message:
                    "Reassign, unassign, or delete this member's stories before removing them."
            });
        }

        await projectMemberships.deleteOne({
            project_id: project._id,
            user_id: userObjectId
        });

        return res.json({
            message: "Member removed successfully!"
        });
    })
);

// =====================================================
// PA4: CREATE USER STORY
// =====================================================

app.post(
    "/projects/:projectId/stories",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        const {
            title,
            description,
            priority,
            assigned_user_id
        } = req.body || {};

        const validation = validateStory({
            title,
            description,
            priority,
            status: "To Do"
        });

        if (validation) {
            return res.status(400).json({
                message: validation
            });
        }

        const assignment = await validateAssignedMember(
            req.params.projectId,
            assigned_user_id
        );

        if (assignment.error) {
            return res.status(400).json({
                message: assignment.error
            });
        }

        // New stories always start as To Do.
        const story = {
            project_id: project._id,
            title: title.trim(),
            description: description.trim(),
            priority,
            status: "To Do",
            assigned_user_id: assignment.value
        };

        const inserted = await userStories.insertOne(story);

        return res.status(201).json({
            message: "User story created successfully!",
            story: await withAssignedName({
                ...story,
                _id: inserted.insertedId
            })
        });
    })
);

// =====================================================
// PA4: VIEW PROJECT BACKLOG
// =====================================================

app.get(
    "/projects/:projectId/stories",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        // Include all stories, even Done stories.
        const stories = await userStories
            .find({
                project_id: project._id
            })
            .toArray();

        return res.json(
            await Promise.all(
                stories.map(withAssignedName)
            )
        );
    })
);

// =====================================================
// PA4: VIEW ONE USER STORY
// =====================================================

app.get(
    "/projects/:projectId/stories/:storyId",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        if (!validId(req.params.storyId)) {
            return res.status(400).json({
                message: "Invalid story ID."
            });
        }

        const story = await userStories.findOne({
            _id: new ObjectId(req.params.storyId),
            project_id: project._id
        });

        if (!story) {
            return res.status(404).json({
                message: "Story not found in this project."
            });
        }

        return res.json(
            await withAssignedName(story)
        );
    })
);

// =====================================================
// PA4: EDIT USER STORY
// =====================================================

const updateStory = asyncRoute(async (req, res) => {
    const project = await getProject(
        req.params.projectId,
        res
    );

    if (!project) return;

    if (!validId(req.params.storyId)) {
        return res.status(400).json({
            message: "Invalid story ID."
        });
    }

    const body = req.body || {};

    // Never allow an existing story to change projects.
    if (
        Object.prototype.hasOwnProperty.call(
            body,
            "project_id"
        )
    ) {
        return res.status(400).json({
            message: "A story cannot move to another project."
        });
    }

    const filter = {
        _id: new ObjectId(req.params.storyId),
        project_id: project._id
    };

    const existing = await userStories.findOne(filter);

    if (!existing) {
        return res.status(404).json({
            message: "Story not found in this project."
        });
    }

    // Keep existing values if a field was not provided.
    const changed = {
        title:
            body.title === undefined
                ? existing.title
                : body.title,

        description:
            body.description === undefined
                ? existing.description
                : body.description,

        priority:
            body.priority === undefined
                ? existing.priority
                : body.priority,

        status:
            body.status === undefined
                ? existing.status
                : body.status
    };

    const validation = validateStory(changed);

    if (validation) {
        return res.status(400).json({
            message: validation
        });
    }

    const memberId =
        body.assigned_user_id === undefined
            ? (
                existing.assigned_user_id
                    ? String(existing.assigned_user_id)
                    : null
              )
            : body.assigned_user_id;

    const assignment = await validateAssignedMember(
        req.params.projectId,
        memberId
    );

    if (assignment.error) {
        return res.status(400).json({
            message: assignment.error
        });
    }

    const update = {
        title: changed.title.trim(),
        description: changed.description.trim(),
        priority: changed.priority,
        status: changed.status,
        assigned_user_id: assignment.value
    };

    await userStories.updateOne(
        filter,
        {
            $set: update
        }
    );

    return res.json({
        message: "User story updated successfully!",
        story: await withAssignedName({
            ...existing,
            ...update
        })
    });
});

// Allow PUT and PATCH for updating stories.
app.put(
    "/projects/:projectId/stories/:storyId",
    updateStory
);

app.patch(
    "/projects/:projectId/stories/:storyId",
    updateStory
);

// =====================================================
// PA4: DELETE USER STORY
// =====================================================

app.delete(
    "/projects/:projectId/stories/:storyId",
    asyncRoute(async (req, res) => {
        const project = await getProject(
            req.params.projectId,
            res
        );

        if (!project) return;

        if (!validId(req.params.storyId)) {
            return res.status(400).json({
                message: "Invalid story ID."
            });
        }

        const result = await userStories.deleteOne({
            _id: new ObjectId(req.params.storyId),
            project_id: project._id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Story not found in this project."
            });
        }

        return res.json({
            message: "User story deleted successfully!"
        });
    })
);

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    res.status(500).json({
        message: "Internal server error."
    });
});

// =====================================================
// CONNECT TO MONGODB AND START SERVER
// =====================================================

async function start() {
    if (!MONGO_URI) {
        throw new Error(
            "MONGO_URI is missing from server/.env"
        );
    }

    const client = new MongoClient(MONGO_URI);

    await client.connect();

    const db = client.db(DB_NAME);

    // Existing MongoDB collections
    users = db.collection("users");
    projects = db.collection("Projects");
    projectMemberships = db.collection("ProjectMemberships");

    // PA4 MongoDB collection
    userStories = db.collection("UserStories");

    // Prevent duplicate project memberships.
    await projectMemberships.createIndex(
        {
            project_id: 1,
            user_id: 1
        },
        {
            unique: true
        }
    );

    await userStories.createIndex({
        project_id: 1
    });

    await userStories.createIndex({
        project_id: 1,
        assigned_user_id: 1
    });

    console.log("Connected to MongoDB");

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    server.on("error", error => {
        if (error.code === "EADDRINUSE") {
            console.error(
                `Port ${PORT} is already in use. Stop the old server first.`
            );
        } else {
            console.error(
                "Server startup error:",
                error
            );
        }

        process.exit(1);
    });
}

start().catch(error => {
    console.error(
        "Could not start backend:",
        error
    );

    process.exit(1);
});
