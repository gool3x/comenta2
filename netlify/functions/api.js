import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { method, query, body } = req
  
  res.headers.set('Content-Type', 'application/json')
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  
  try {
    // GET post by slug
    if (method === 'GET' && query.slug) {
      const { data: post } = await supabase
        .from('posts')
        .select('id, title')
        .eq('slug', query.slug)
        .single()
      
      return res.json(post)
    }
    
    // GET likes count + visitor status
    if (method === 'GET' && query.post_id && query.visitor_id) {
      const [{ count }, { data: userLike }] = await Promise.all([
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', query.post_id),
        supabase
          .from('likes')
          .select('id')
          .eq('post_id', query.post_id)
          .eq('visitor_id', query.visitor_id)
          .maybeSingle()
      ])
      
      return res.json({ count: count || 0, hasLiked: !!userLike })
    }
    
    // GET comments
    if (method === 'GET' && query.post_id) {
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', query.post_id)
        .order('created_at', { ascending: false })
      
      return res.json(comments)
    }
    
    // POST toggle like
    if (method === 'POST' && body.action && body.post_id && body.visitor_id) {
      if (body.action === 'remove') {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', body.post_id)
          .eq('visitor_id', body.visitor_id)
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: body.post_id, visitor_id: body.visitor_id })
      }
      
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', body.post_id)
      
      return res.json({ count: count || 0, hasLiked: body.action === 'add' })
    }
    
    // POST create comment
    if (method === 'POST' && body.post_id && body.author_name && body.content) {
      await supabase
        .from('comments')
        .insert({
          post_id: body.post_id,
          author_name: body.author_name,
          content: body.content
        })
      
      return res.json({ success: true })
    }
    
    return res.status(404).json({ error: 'Endpoint não encontrado' })
    
  } catch (err) {
    console.error('API Error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export const supabaseConfig = {
  handler
}
