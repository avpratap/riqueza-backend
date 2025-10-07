const db = require('../config/database');

class ContactController {
  // Submit contact form
  static async submitContactForm(req, res) {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          error: 'Please provide all required fields: name, email, subject, and message'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
      }

      // Insert contact message into database
      const query = `
        INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const result = await db.query(query, [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        subject.trim(),
        message.trim(),
        'new'
      ]);

      const contactMessage = result.rows[0];

      console.log('✅ Contact message saved:', contactMessage.id);

      // Log activity in user_activity_log
      try {
        await db.query(`
          INSERT INTO user_activity_log (user_email, activity_type, activity_id, title) 
          VALUES ($1, 'contact', $2, $3)
        `, [email.trim().toLowerCase(), contactMessage.id, subject.trim()]);
        
        // Update user profile
        await db.query(`
          INSERT INTO user_profiles (email, name, phone, total_contacts, last_activity) 
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
          ON CONFLICT (email) DO UPDATE SET 
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            total_contacts = user_profiles.total_contacts + 1,
            last_activity = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [email.trim().toLowerCase(), name.trim(), phone?.trim() || null]);
        
        console.log('✅ Activity logged and user profile updated');
      } catch (activityError) {
        console.error('⚠️ Activity logging failed (non-critical):', activityError.message);
      }

      // In a real application, you might want to:
      // - Send an email notification to admin
      // - Send a confirmation email to the user
      // - Trigger a webhook or notification system

      res.status(201).json({
        success: true,
        message: 'Thank you for contacting us! We will get back to you within 24 hours.',
        data: {
          id: contactMessage.id,
          name: contactMessage.name,
          email: contactMessage.email,
          phone: contactMessage.phone,
          subject: contactMessage.subject,
          message: contactMessage.message,
          status: contactMessage.status,
          createdAt: contactMessage.created_at
        }
      });

    } catch (error) {
      console.error('❌ Contact form submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit contact form. Please try again later.'
      });
    }
  }

  // Get all contact messages (admin only)
  static async getAllMessages(req, res) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT * FROM contact_messages
      `;
      const params = [];
      
      if (status) {
        query += ` WHERE status = $1`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });

    } catch (error) {
      console.error('❌ Get contact messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contact messages'
      });
    }
  }

  // Update message status (admin only)
  static async updateMessageStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['new', 'in-progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: new, in-progress, resolved, closed'
        });
      }

      const query = `
        UPDATE contact_messages
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [status, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contact message not found'
        });
      }

      res.json({
        success: true,
        message: 'Message status updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('❌ Update message status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update message status'
      });
    }
  }
}

module.exports = ContactController;

