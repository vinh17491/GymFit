import { Router } from 'express';
import { register, login, logout, getMe, refreshToken } from './auth.controller';
import { updateMe, changePassword, uploadAvatar, deleteAvatar } from './me.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './auth.validation';
import { authLimiter } from '../../middleware/rateLimiter';
import { z } from 'zod';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG and WebP images are allowed'));
}});

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
}).strict();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, validate(z.object({ refreshToken: z.string().min(32).max(256) }).strict()), refreshToken);
router.get('/me', authenticate, getMe);

router.put('/me', authenticate, validate(updateProfileSchema), updateMe);
router.post('/password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);

export default router;
