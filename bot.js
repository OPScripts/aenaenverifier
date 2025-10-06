const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

const CRUEL_MEMBER_ROLE_ID = '1347486304492982374';
const GUEST_ROLE_ID = '1347497581009178645';

let verificationLogChannelId = null;

async function sendVerificationLog(guild, user, aqwUsername, roleAdded) {
  if (!verificationLogChannelId) {
    return;
  }

  try {
    const logChannel = await guild.channels.fetch(verificationLogChannelId);
    
    const logoAttachment = new AttachmentBuilder('attached_assets/cruel_1759722587306.png', { name: 'cruel_logo.png' });
    
    const roleMention = roleAdded === 'Cruel Member' ? `<@&${CRUEL_MEMBER_ROLE_ID}>` : `<@&${GUEST_ROLE_ID}>`;
    
    const logEmbed = new EmbedBuilder()
      .setColor(roleAdded === 'Cruel Member' ? '#FF0000' : '#808080')
      .setTitle('Verification Complete')
      .setThumbnail('attachment://cruel_logo.png')
      .addFields(
        { name: 'Verified User', value: `${user.user.tag} (${user.id})`, inline: false },
        { name: 'AQW IGN', value: aqwUsername, inline: false },
        { name: 'User', value: `${user}`, inline: false },
        { name: 'Role Added', value: roleMention, inline: false }
      )
      .setFooter({ text: new Date().toLocaleString() });

    await logChannel.send({ embeds: [logEmbed], files: [logoAttachment] });
  } catch (error) {
    console.error('Error sending verification log:', error);
  }
}

async function scrapeAQWGuild(username) {
  try {
    const url = `https://account.aq.com/CharPage?id=${encodeURIComponent(username)}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const pageContent = response.data.toLowerCase();
    const isCruel = pageContent.includes('cruel');

    return {
      success: true,
      isCruel: isCruel,
      username: username
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return {
        success: false,
        error: 'Character not found'
      };
    }
    return {
      success: false,
      error: 'Failed to fetch character page'
    };
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  const commands = [
    new SlashCommandBuilder()
      .setName('verify-panel')
      .setDescription('Create a verification panel in the specified channel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel to send the verification panel to')
          .setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName('verify-log')
      .setDescription('Set the channel for verification logs')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel to send verification logs to')
          .setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  try {
    console.log('Registering slash commands...');
    await client.application.commands.set(commands);
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'verify-panel') {
      const channel = interaction.options.getChannel('channel');
      
      const logoAttachment = new AttachmentBuilder('attached_assets/cruel_1759722587306.png', { name: 'cruel_logo.png' });
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('WELCOME TO CRUEL')
        .setThumbnail('attachment://cruel_logo.png')
        .setDescription(
          '• Step 1: Read the <#1347490129765470339>\n' +
          '• Step 2: Press the verify button and fill out the necessary information. This will give you access to the rest of the server.\n' +
          '• Step 3: Choose your <#1347493369651400714> and <#1347510993852305520>\n' +
          '• Step 4: Let us know if you are in our guild to get access to guild-only chat.\n' +
          '• Step 5: Boost the server to get custom colors, roles, emojis, channels, XP boosts, and access to a secret channel. 😉'
        );

      const button = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      try {
        await channel.send({
          embeds: [embed],
          components: [row],
          files: [logoAttachment]
        });
        
        await interaction.reply({
          content: `Verification panel created in ${channel}!`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error sending verification panel:', error);
        await interaction.reply({
          content: 'Failed to create verification panel. Make sure I have permission to send messages in that channel.',
          ephemeral: true
        });
      }
    }

    if (interaction.commandName === 'verify-log') {
      const channel = interaction.options.getChannel('channel');
      verificationLogChannelId = channel.id;
      
      await interaction.reply({
        content: `✅ Verification logs will now be sent to ${channel}!`,
        ephemeral: true
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'verify_button') {
      const hasVerificationRole = interaction.member.roles.cache.has(CRUEL_MEMBER_ROLE_ID) || 
                                   interaction.member.roles.cache.has(GUEST_ROLE_ID);
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (hasVerificationRole && !isAdmin) {
        await interaction.reply({
          content: 'You are already verified',
          ephemeral: true
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('Cruel Verification');

      const usernameInput = new TextInputBuilder()
        .setCustomId('aqw_username')
        .setLabel('Enter your AQW Username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Your AQW username');

      const row = new ActionRowBuilder().addComponents(usernameInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'verify_modal') {
      await interaction.deferReply({ ephemeral: true });

      const hasVerificationRole = interaction.member.roles.cache.has(CRUEL_MEMBER_ROLE_ID) || 
                                   interaction.member.roles.cache.has(GUEST_ROLE_ID);
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (hasVerificationRole && !isAdmin) {
        await interaction.editReply({
          content: 'You are already verified.'
        });
        return;
      }

      const username = interaction.fields.getTextInputValue('aqw_username');

      await interaction.editReply({
        content: `⏳ Looking up **${username}** to check if they're in the guild...`
      });

      const result = await scrapeAQWGuild(username);

      if (!result.success) {
        await interaction.editReply({
          content: `❌ **Verification Failed**\n${result.error}. Please check your username and try again.`
        });
        return;
      }

      if (!interaction.member) {
        await interaction.editReply({
          content: '❌ **Error**\nUnable to verify your server membership. Please try again.'
        });
        return;
      }

      const guild = interaction.guild;
      
      if (!guild) {
        await interaction.editReply({
          content: '❌ **Error**\nUnable to access server information. Please try again.'
        });
        return;
      }

      const cruelRole = guild.roles.cache.get(CRUEL_MEMBER_ROLE_ID);
      const guestRole = guild.roles.cache.get(GUEST_ROLE_ID);

      if (!cruelRole || !guestRole) {
        await interaction.editReply({
          content: '❌ **Configuration Error**\nThe verification roles are not properly configured. Please contact an administrator.'
        });
        return;
      }

      if (result.isCruel) {
        await interaction.editReply({
          content: `✅ **Verification Successful!**\nWelcome, ${username}! You have been verified as a CRUEL guild member.`
        });
        
        try {
          if (interaction.member.roles.cache.has(GUEST_ROLE_ID)) {
            await interaction.member.roles.remove(GUEST_ROLE_ID);
          }
          if (!interaction.member.roles.cache.has(CRUEL_MEMBER_ROLE_ID)) {
            await interaction.member.roles.add(CRUEL_MEMBER_ROLE_ID);
          }
        } catch (error) {
          console.error('Error managing CRUEL member role:', error);
          await interaction.followUp({
            content: '⚠️ **Role Assignment Error**\nI verified you are a CRUEL member, but I cannot assign the role. Please ask an administrator to:\n1. Move the bot\'s role **above** the CRUEL member role in Server Settings → Roles\n2. Make sure the bot has "Manage Roles" permission',
            ephemeral: true
          });
        }
        
        try {
          if (interaction.member.id === interaction.guild.ownerId) {
            await interaction.followUp({
              content: '⚠️ **Note:** Your nickname cannot be changed because you are the server owner. Discord does not allow bots to change the server owner\'s nickname. Please change it manually to your AQW username.',
              ephemeral: true
            });
          } else {
            await interaction.member.setNickname(username);
          }
        } catch (error) {
          console.error('Error changing nickname:', error);
          await interaction.followUp({
            content: `⚠️ **Nickname Change Failed**\nI could not change your nickname to "${username}". Please contact Aenaen or an Admin`,
            ephemeral: true
          });
        }

        await sendVerificationLog(guild, interaction.member, username, 'Cruel Member');
      } else {
        await interaction.editReply({
          content: `✅ **Verification Successful!**\nWelcome, ${username}! You have been verified as a Guest member.`
        });
        
        try {
          if (interaction.member.roles.cache.has(CRUEL_MEMBER_ROLE_ID)) {
            await interaction.member.roles.remove(CRUEL_MEMBER_ROLE_ID);
          }
          if (!interaction.member.roles.cache.has(GUEST_ROLE_ID)) {
            await interaction.member.roles.add(GUEST_ROLE_ID);
          }
        } catch (error) {
          console.error('Error managing guest role:', error);
          await interaction.followUp({
            content: 'There was an error assigning your role. Please contact an administrator.',
            ephemeral: true
          });
        }
        
        try {
          if (interaction.member.id === interaction.guild.ownerId) {
            await interaction.followUp({
              content: '⚠️ **Note:** Your nickname cannot be changed because you are the server owner. Discord does not allow bots to change the server owner\'s nickname. Please change it manually to your AQW username.',
              ephemeral: true
            });
          } else {
            await interaction.member.setNickname(username);
          }
        } catch (error) {
          console.error('Error changing nickname:', error);
          await interaction.followUp({
            content: `⚠️ **Nickname Change Failed**\nI could not change your nickname to "${username}". Please contact Aenaen or Administrator.`,
            ephemeral: true
          });
        }

        await sendVerificationLog(guild, interaction.member, username, 'Guest');
      }
    }
  }
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is not set!');
  process.exit(1);
}

client.login(token);
