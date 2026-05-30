const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

// GET /api/agentes
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('agentes')
    .select('*')
    .order('nome')

  if (error) throw { status: 400, message: error.message }

  res.json(data)
}))

// POST /api/agentes
router.post('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('agentes')
    .insert(req.body)
    .select()
    .single()

  if (error) throw { status: 400, message: error.message }

  res.status(201).json(data)
}))

module.exports = router
