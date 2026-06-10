import { createClient } from '@supabase/supabase-js'

// ✅ Credenciais salvos como environment variables (não no código!)
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  // Parse request
  const { method, query, body } = req
  
  // CORS headers
  res.headers.set('Content-Type', 'application/json')
  res.headers.set('Access-Control-Allow-Origin', '*')
  
  try {
    // Router
    if (method === 'GET' && query.slug) {
      // Get post by slug
      const { data: post } = await supabase
        .from('posts')
        .select('id, title')
        .eq('slug', query.slug)
        .single()
      return res.json(post)
    }
    
    if (method === 'GET' && query.post_id && query.visitor_id) {
      // Get likes count + if visitor liked
      const [{ count }, { data: userLike }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true })
          .eq('post_id', query.post_id),
        supabase.from('likes').select('id')
          .eq('post_id', query.post_id)
          .eq('visitor_id', query.visitor_id)
          .maybeSingle()
      ])
      return res.json({ count, hasLiked: !!userLike })
    }
    
    if (method === 'GET' && query.post_id) {
      // Get comments
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', query.post_id)
        .order('created_at', { ascending: false })
      return res.json(comments)
    }
    
    if (method === 'POST' && body.action) {
      // Toggle like
      const { post_id, visitor_id, action } = body
      
      if (action === 'remove') {
        await supabase.from('likes')
          .delete()
          .eq('post_id', post_id)
          .eq('visitor_id', visitor_id)
      } else {
        await supabase.from('likes')
          .insert({ post_id, visitor_id })
      }
      
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id)
      
      return res.json({ count, hasLiked: action === 'add' })
    }
    
    if (method === 'POST' && body.post_id && body.author_name) {
      // Create comment
      await supabase.from('comments').insert({
        post_id: body.post_id,
        author_name: body.author_name,
        content: body.content
      })
      return res.json({ success: true })
    }
    
    return res.status(404).json({ error: 'Not found' })
    
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}

export const supabaseConfig = {
  handler: handler
}
