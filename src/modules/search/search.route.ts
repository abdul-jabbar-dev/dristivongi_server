import { Router } from 'express';
import optionalAuth from '../../middlewares/optionalAuth';
import searchController from './search.controller';

const searchRoute = Router();

// Global unified search endpoint
searchRoute.get('/', optionalAuth, searchController.globalSearch);

// Fast autocomplete suggestions endpoint
searchRoute.get('/suggestions', optionalAuth, searchController.getSuggestions);

export default searchRoute;
