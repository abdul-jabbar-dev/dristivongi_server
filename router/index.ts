import { Router } from "express";
import userRoute from "../src/modules/user/user.route";
import caseRoute from "../src/modules/case/case.route";
import authRoute from "../src/modules/auth/auth.route";
import opinionRoute from "../src/modules/opinion/opinion.route";
import { tagRoutes } from "../src/modules/tag/tag.route";
import mediaRoute from "../src/modules/media/media.route";
import evidenceRoute from "../src/modules/evidence/evidence.route";
import organizationRoute from "../src/modules/organization/organization.route";
import feedRoute from "../src/modules/feed/feed.route";
import searchRoute from "../src/modules/search/search.route";

const apiRoutes = Router()

apiRoutes.use('/user', userRoute)
apiRoutes.use('/case', caseRoute)
apiRoutes.use('/auth', authRoute)
apiRoutes.use('/opinions', opinionRoute)
apiRoutes.use('/tags', tagRoutes)
apiRoutes.use('/media', mediaRoute)
apiRoutes.use('/evidence', evidenceRoute)
apiRoutes.use('/organizations', organizationRoute)
apiRoutes.use('/feed', feedRoute)
apiRoutes.use('/search', searchRoute)

export default apiRoutes