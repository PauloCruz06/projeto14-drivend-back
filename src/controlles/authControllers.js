import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import joi from 'joi';

export async function createUser(req, res) {
  const body = req.body;
 
  if(req.body.password!==req.body.passwordConfirmation){
    return res.sendStatus(422);
  }
  const usuarioSchema = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    photo:joi.string().uri().required(),
    password: joi.string().required(),
  });
  const usuario = {
    name: body.name,
    email: body.email,
    photo: body.photo,
    password:body.password
  }
  
  const { error } = usuarioSchema.validate(usuario);

  if (error) {
    return res.sendStatus(422);
  }

  const senhaCriptografada = bcrypt.hashSync(usuario.password, 10);

  await db.collection('usuarios').insertOne({ ...usuario, password: senhaCriptografada});
  res.status(201).send('Usuário criado com sucesso');
}

export async function loginUser(req, res) {
  const usuario = req.body;

  const usuarioSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  });

  const { error } = usuarioSchema.validate(usuario);

  if (error) {
    return res.sendStatus(422);
  }

  const userdb = await db.collection('usuarios').findOne({ email: usuario.email });

  if (userdb && bcrypt.compareSync(usuario.password, userdb.password)) {
    const token = uuid();
    const {name,email, photo}=userdb;

    await db.collection("sessoes").deleteMany({ userId: userdb._id });

    await db.collection('sessoes').insertOne({
      token,
      userId: userdb._id
    });

    return res.status(201).send({ name, email, photo, token });
  } else {
    return res.status(401).send('Senha ou email incorretos!');
  }
}