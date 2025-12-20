import { Router } from 'express';

const router = Router();

router.post('/ingest', (req, res) => {
    res.status(200).json({ message: 'Ingest successful' });
});

export default router;