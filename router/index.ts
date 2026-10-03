import { Router } from "express";
import userRoute from "../src/modules/user/user.route";
import caseRoute from "../src/modules/case/case.route";
import authRoute from "../src/modules/auth/auth.route";
import opinionRoute from "../src/modules/opinion/opinion.route";
import { tagRoutes } from "../src/modules/tag/tag.route";
import mediaRoute from "../src/modules/media/media.route";

const apiRoutes = Router()

apiRoutes.use('/user', userRoute)
apiRoutes.use('/case', caseRoute)
apiRoutes.use('/auth', authRoute)
apiRoutes.use('/opinions', opinionRoute)
apiRoutes.use('/tags', tagRoutes)
apiRoutes.use('/media', mediaRoute)

export default apiRoutes