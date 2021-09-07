const Sequelize = require("sequelize");
//Require jwt in the database file*
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { STRING } = Sequelize;
const config = {
  logging: false,
};

const tokenSecret = process.env.JWT;
const saltRounds = 10;


if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
    text: STRING
})

Note.belongsTo(User);
User.hasMany(Note);


User.byToken = async (token) => {
  try {
    // const user = await User.findByPk(token);
    const verifiedToken = jwt.verify(token, tokenSecret);
    const user = await User.findByPk(verifiedToken.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });

    const truePW = await bcrypt.compare(password, user.password);

  if (truePW) {
    const tokenGenerated = jwt.sign(
        { userId: user.id },
        tokenSecret
    );
    return tokenGenerated
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

    const notes = [
        { text: "hello world" },
        { text: "reminder to buy groceries" },
        { text: "reminder to do laundry" },
    ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

    const [note1, note2, note3] = await Promise.all(
        notes.map((note) => Note.create(note))
    );

    await lucy.setNotes(note1);
    await moe.setNotes([note2, note3]);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

User.beforeCreate(async (user) => {
    user.password = await bcrypt.hash(user.password, saltRounds);
});

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
