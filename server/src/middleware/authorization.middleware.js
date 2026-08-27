import { prisma } from "../lib/prisma.js";

export function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication is required."
        });
      }

      const userPermission = await prisma.userRole.findFirst({
        where: {
          userId: req.user.id,
          role: {
            permissions: {
              some: {
                permission: {
                  name: permissionName
                }
              }
            }
          }
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!userPermission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
          requiredPermission: permissionName
        });
      }

      req.permission = permissionName;
      req.role = userPermission.role;

      next();
    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred during authorization."
      });
    }
  };
}
