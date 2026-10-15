import express from "express";

import {
  hashPassword,
  verifyPassword,
  generateToken,
} from "../services/auth.service.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();
async function getUserPermissions(prisma, userId) {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return [
    ...new Set(
      userRoles.flatMap((userRole) =>
        userRole.role.permissions.map(
          (rolePermission) =>
            rolePermission.permission.name
        )
      )
    ),
  ];
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

async function createUniqueOrganizationSlug(prisma, baseName) {
  const baseSlug = createSlug(baseName) || "organization";

  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.organization.findUnique({
      where: { slug },
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { prisma } = req.app.locals;

  try {
    const {
      email,
      password,
      firstName,
      lastName,
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password, first name and last name are required.",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password must be valid text values.",
      });
    }

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "First name and last name must be valid text values.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (
      !normalizedEmail ||
      !normalizedFirstName ||
      !normalizedLastName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, first name and last name cannot be empty.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      });

      const organizationName =
        `${normalizedFirstName} ${normalizedLastName}'s Organization`;

      const organizationSlug =
        await createUniqueOrganizationSlug(
          tx,
          organizationName
        );

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
          description:
            "Default organization created during account registration.",
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Main Workspace",
          slug: "main-workspace",
          description:
            "Default workspace created during account registration.",
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      });

      const organizationAdminRole =
        await tx.role.findUnique({
          where: {
            name: "Organization Admin",
          },
        });

      if (!organizationAdminRole) {
        throw new Error(
          "Organization Admin role is not configured. Run the RBAC seed before registering users."
        );
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: organizationAdminRole.id,
          workspaceId: null,
        },
      });

      return {
        user,
        organization,
        workspace,
        role: organizationAdminRole,
      };
    });

    const token = generateToken(result.user);

    return res.status(201).json({
      success: true,
      message: "Account and organization created successfully.",
      token,
      user: result.user,
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      role: {
        id: result.role.id,
        name: result.role.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { prisma } = req.app.locals;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This user account is inactive.",
      });
    }

    const passwordMatches = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const token = generateToken(user);
    const permissions = await getUserPermissions(
      prisma,
      user.id
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        permissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process login.",
    });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  const { prisma } = req.app.locals;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This user account is inactive.",
      });
    }

    const permissions = await getUserPermissions(
      prisma,
      user.id
    );

    return res.json({
      success: true,
      user: {
        ...user,
        permissions,
      },
    });
  } catch (error) {
    console.error("Current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve current user.",
    });
  }
});

export default router;
