const Discord = require('discord.js');
const dateFormat = require('dateformat');

module.exports = {
  name: 'kick',
  description: 'Kick a user',

  execute(msg, con, args) {
    const {status, err, toKick, reason} = validKick(msg);
    if (!status) {
      return msg.reply(err);
    }

    kickUser(msg, toKick, reason);
    kickSQL(msg, toKick, reason, args, con);
    kickEmbed(msg, toKick, reason);
  },
};

function validKick(msg) {
  const data = {
    status: false,
    err: null,
    toKick: null,
    reason: null,
  };

  if (
    !msg.member.roles.cache.some(
      (role) =>
        role.name === 'Admin' ||
        role.name === 'Moderator' ||
        role.name === 'Super User'
    )
  ) {
    data.err = msg.reply(
      'You must be an Admin, Moderator, or Super User to use this command.'
    );
    return data;
  }

  // Grabs the user and makes sure that one was provided
  data.toKick = msg.mentions.members.first();
  if (!data.toKick) {
    data.err = 'Please provide a user to kick.';
    return data;
  }

  // Prevents you from kicking yourself
  if (data.toKick.id == msg.author.id) {
    data.err = "You can't kick yourself!";
    return data;
  }

  // Checks that the person who is getting kicked doesn't have kick privileges
  if (data.toKick.hasPermission('KICK_MEMBERS')) {
    data.err = 'This user also has kick privileges.';
    return data;
  }

  // Checks that a reason was included
  data.reason = msg.content.substr(msg.content.indexOf('>') + 2);
  if (data.reason === '') {
    data.err = 'Please provide a reason for kicking.';
    return data;
  }

  data.status = true;
  return data;
}

function kickSQL(msg, toKick, reason, args, con) {
  const now = new Date();
  const date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');

  const action = 'cc!kick ' + args.join(' ');

  // Inserts row into database
  const sql = `INSERT INTO infractions (timestamp, user, action, length_of_time, reason, valid, moderator) VALUES 
    (?, ?, 'cc!kick', NULL, ?, true, ?);
    INSERT INTO mod_log (timestamp, moderator, action, length_of_time, reason) VALUES
    (?, ?, ?, NULL, ?)`;
  const values = [
    date,
    toKick.id,
    reason,
    msg.author.id,
    date,
    msg.author.id,
    action,
    reason,
  ];

  const escaped = con.format(sql, values);

  con.query(escaped, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log('1 record inserted');
    }
  });
}

function kickEmbed(msg, toKick, reason) {
  // Sends Audit Log Embed
  const channel = msg.guild.channels.cache.find(
    (channel) => channel.name === 'audit-logs'
  );

  const kickEmbed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle(
      `${toKick.user.username}#${toKick.user.discriminator} was kicked by ${msg.author.tag}:`
    )
    .setDescription(reason)
    .setThumbnail(
      `https://cdn.discordapp.com/avatars/${toKick.user.id}/${toKick.user.avatar}.png`
    )
    .setTimestamp()
    .setFooter(`${msg.guild.name}`);

  channel.send(kickEmbed);
}

function kickUser(msg, toKick, reason) {
  // Actual Kick
  toKick.send(
    "You've been kicked for the following reason: ```" + reason + ' ```'
  );
  toKick.kick({reason});

  msg.reply(`${toKick} was kicked.`);
}
