const pool = require('../config/database');

class Product {
  static async getAll() {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'battery_capacity', pv.battery_capacity,
              'range_km', pv.range_km,
              'top_speed_kmh', pv.top_speed_kmh,
              'acceleration_sec', pv.acceleration_sec,
              'price', pv.price,
              'is_new', pv.is_new,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pc.id,
              'name', pc.name,
              'color_code', pc.color_code,
              'css_filter', pc.css_filter
            )
          ) FILTER (WHERE pc.id IS NOT NULL), 
          '[]'::json
        ) as colors,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'display_order', pi.display_order,
              'is_primary', pi.is_primary
            )
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_active = true
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      // Return products with raw UUIDs (no prefixes)
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getById(id) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'battery_capacity', pv.battery_capacity,
              'range_km', pv.range_km,
              'top_speed_kmh', pv.top_speed_kmh,
              'acceleration_sec', pv.acceleration_sec,
              'price', pv.price,
              'is_new', pv.is_new,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pc.id,
              'name', pc.name,
              'color_code', pc.color_code,
              'css_filter', pc.css_filter
            )
          ) FILTER (WHERE pc.id IS NOT NULL), 
          '[]'::json
        ) as colors,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'display_order', pi.display_order,
              'is_primary', pi.is_primary
            )
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ps.id,
              'spec_name', ps.spec_name,
              'spec_value', ps.spec_value,
              'spec_unit', ps.spec_unit,
              'display_order', ps.display_order
            )
          ) FILTER (WHERE ps.id IS NOT NULL), 
          '[]'::json
        ) as specifications,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pf.id,
              'feature_name', pf.feature_name,
              'feature_description', pf.feature_description,
              'display_order', pf.display_order
            )
          ) FILTER (WHERE pf.id IS NOT NULL), 
          '[]'::json
        ) as features
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_active = true
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_specifications ps ON p.id = ps.product_id
      LEFT JOIN product_features pf ON p.id = pf.product_id
      WHERE p.id = $1 AND p.is_active = true
      GROUP BY p.id
    `;
    
    try {
      const result = await pool.query(query, [pureUuid]);
      if (result.rows[0]) {
        // Return product with raw UUIDs (no prefixes)
        return result.rows[0];
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getBySlug(slug) {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'battery_capacity', pv.battery_capacity,
              'range_km', pv.range_km,
              'top_speed_kmh', pv.top_speed_kmh,
              'acceleration_sec', pv.acceleration_sec,
              'price', pv.price,
              'is_new', pv.is_new,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pc.id,
              'name', pc.name,
              'color_code', pc.color_code,
              'css_filter', pc.css_filter
            )
          ) FILTER (WHERE pc.id IS NOT NULL), 
          '[]'::json
        ) as colors,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'display_order', pi.display_order,
              'is_primary', pi.is_primary
            )
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ps.id,
              'spec_name', ps.spec_name,
              'spec_value', ps.spec_value,
              'spec_unit', ps.spec_unit,
              'display_order', ps.display_order
            )
          ) FILTER (WHERE ps.id IS NOT NULL), 
          '[]'::json
        ) as specifications,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pf.id,
              'feature_name', pf.feature_name,
              'feature_description', pf.feature_description,
              'display_order', pf.display_order
            )
          ) FILTER (WHERE pf.id IS NOT NULL), 
          '[]'::json
        ) as features
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_active = true
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_specifications ps ON p.id = ps.product_id
      LEFT JOIN product_features pf ON p.id = pf.product_id
      WHERE p.slug = $1 AND p.is_active = true
      GROUP BY p.id
    `;
    
    try {
      const result = await pool.query(query, [slug]);
      if (result.rows[0]) {
        // Return product with raw UUIDs (no prefixes)
        return result.rows[0];
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getFeatured() {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'battery_capacity', pv.battery_capacity,
              'range_km', pv.range_km,
              'top_speed_kmh', pv.top_speed_kmh,
              'acceleration_sec', pv.acceleration_sec,
              'price', pv.price,
              'is_new', pv.is_new,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pc.id,
              'name', pc.name,
              'color_code', pc.color_code,
              'css_filter', pc.css_filter
            )
          ) FILTER (WHERE pc.id IS NOT NULL), 
          '[]'::json
        ) as colors,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'display_order', pi.display_order,
              'is_primary', pi.is_primary
            )
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_active = true
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_active = true AND p.is_featured = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      // Return products with raw UUIDs (no prefixes)
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByCategory(category) {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'battery_capacity', pv.battery_capacity,
              'range_km', pv.range_km,
              'top_speed_kmh', pv.top_speed_kmh,
              'acceleration_sec', pv.acceleration_sec,
              'price', pv.price,
              'is_new', pv.is_new,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pc.id,
              'name', pc.name,
              'color_code', pc.color_code,
              'css_filter', pc.css_filter
            )
          ) FILTER (WHERE pc.id IS NOT NULL), 
          '[]'::json
        ) as colors,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'display_order', pi.display_order,
              'is_primary', pi.is_primary
            )
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_active = true
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_active = true AND p.category = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [category]);
      // Return products with raw UUIDs (no prefixes)
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const { name, slug, description, category, base_price, original_price, is_featured } = productData;
    
    const query = `
      INSERT INTO products (name, slug, description, category, base_price, original_price, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [name, slug, description, category, base_price, original_price, is_featured];
    
    try {
      const result = await pool.query(query, values);
      // Return product with raw UUID (no prefix)
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(pureUuid);
    const query = `
      UPDATE products 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `prod_${result.rows[0].id}`
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const query = 'UPDATE products SET is_active = false WHERE id = $1 RETURNING *';
    const values = [pureUuid];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `prod_${result.rows[0].id}`
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Product;
