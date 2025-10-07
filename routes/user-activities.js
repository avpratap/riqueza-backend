const express = require('express');
const router = express.Router();
const UserActivityController = require('../controllers/userActivityController');

// Get user activities by email
router.get('/user/:email', UserActivityController.getUserActivities);

// Get all user profiles (admin)
router.get('/profiles', UserActivityController.getAllUserProfiles);

// Get user statistics
router.get('/stats', UserActivityController.getUserStats);

module.exports = router;
