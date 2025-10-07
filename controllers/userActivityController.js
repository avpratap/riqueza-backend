const db = require('../config/database');

class UserActivityController {
  // Get user activities by email
  static async getUserActivities(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email parameter is required'
        });
      }

      // Get user profile
      const profileResult = await db.query(`
        SELECT * FROM user_profiles WHERE email = $1
      `, [email]);

      if (profileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user activities
      const activitiesResult = await db.query(`
        SELECT * FROM get_user_activity_by_email($1)
      `, [email]);

      res.json({
        success: true,
        user: profileResult.rows[0],
        activities: activitiesResult.rows,
        totalActivities: activitiesResult.rows.length
      });

    } catch (error) {
      console.error('❌ Get user activities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user activities'
      });
    }
  }

  // Get all user profiles (admin)
  static async getAllUserProfiles(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const result = await db.query(`
        SELECT * FROM user_profiles 
        ORDER BY last_activity DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.json({
        success: true,
        users: result.rows,
        total: result.rows.length
      });

    } catch (error) {
      console.error('❌ Get all user profiles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profiles'
      });
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(total_contacts) as total_contacts,
          SUM(total_reviews) as total_reviews,
          AVG(total_contacts) as avg_contacts_per_user,
          AVG(total_reviews) as avg_reviews_per_user
        FROM user_profiles
      `);

      const activityStats = await db.query(`
        SELECT 
          activity_type,
          COUNT(*) as count
        FROM user_activity_log 
        GROUP BY activity_type
      `);

      res.json({
        success: true,
        stats: {
          ...statsResult.rows[0],
          activityBreakdown: activityStats.rows
        }
      });

    } catch (error) {
      console.error('❌ Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics'
      });
    }
  }
}

module.exports = UserActivityController;
