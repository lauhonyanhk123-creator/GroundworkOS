import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import jobsRouter from "./jobs";
import quotesRouter from "./quotes";
import invoicesRouter from "./invoices";
import subcontractorsRouter from "./subcontractors";
import documentsRouter from "./documents";
import scheduleRouter from "./schedule";
import plantRouter from "./plant";
import rateBookRouter from "./rate_book";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(jobsRouter);
router.use(quotesRouter);
router.use(invoicesRouter);
router.use(subcontractorsRouter);
router.use(documentsRouter);
router.use(scheduleRouter);
router.use(plantRouter);
router.use(rateBookRouter);
router.use(dashboardRouter);

export default router;
