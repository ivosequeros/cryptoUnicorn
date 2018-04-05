import errors from "restify-errors"
import {User} from './models'
import hash from 'object-hash'
import bcrypt from 'bcrypt'
let actions = {}

actions.status = async (req, res, next) => {
  res.send({
    ok: true
  })
  next()
}

actions.getToken = async (req, res, next) => {
  let generateToken = new Promise(async (resolve, reject) => {
    let check = (email, password) => await User.findOne({
      email: email,
      password: bcrypt.hashSync(password, 10)
    })

    let user = check(req.body.email, req.body.password)
    if(!user) {
      res.send(403, {
        ok: false
      })
      next()
    }


    let token = hash(user.email + new Date().getTime())
    let exists = await User.findOne({ token: token })
    if(exists)
      return generateToken();
    await User.findOneAndUpdate({ email: user.email }, { token: token }).catch(err => reject(err))
    resolve(token);
  })
  let token = await generateToken.catch(err => new errors.ConflictError())
  res.send({
    ok: true,
    token: token
  })
  next()
}

actions.newAccount = async (req, res, next) => {
  console.log(req)
  let exists = await User.findOne({ email: req.body.email })
  if(exists) {
    next(new errors.ConflictError());
    return
  }
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10),
    token: null,
    setup: {}
  });
  await user.save().catch(err => {
    throw err
  })
  res.send({ok: true})
  next()
}

actions.getSetup = async (req, res, next) => {
  res.send({ok: true, setup: req.user.setup || {}});
  next();
}


actions.setSetup = async (req, res, next) => {
  await User.findOneAndUpdate({ email: req.user.email }, { setup: req.body.setup }).catch(err => {
    throw err
  })
  res.send({ok: true});
  next();
}

actions.setStream = async (req, res, next) => {
  /* TODO */
  res.send({ok: true});
  next();
}

export default new Proxy(actions, {
  get: (target, name) => (req, res, next) => target[name](req, res, next).catch(err => {
    console.log(err)
    next(new errors.InternalServerError());
  })
})
