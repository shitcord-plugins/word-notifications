import {Plugin} from "@vizality/entities";
import {patch, unpatch} from "@vizality/patcher";
import {FluxDispatcher, getModule} from "@vizality/webpack";

const ChannelStore = getModule("getChannel");
const MutedStore = getModule("isGuildOrCategoryOrChannelMuted");
const Navigator = getModule("transitionTo");
const currentUserId = getModule("getId").getId();
const FriendsModule = getModule("isBlocked");
const GuildStore = getModule("getGuild");
const SelectedChannelStore = getModule("getChannelId", "getLastSelectedChannelId")
const SelectedGuildStore = getModule("getGuildId", "getLastSelectedGuildId");
const UnreadStore = getModule("getUnreadCount");
const MemberStore = getModule("getMember");
const AvatarModule = getModule("getUserAvatarURL");
const escapeString = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const Native = getModule("purgeMemory", "ensureModule");

export default class WordNotifications extends Plugin {
	start() {
		patch("word-notifications-dispatcher", FluxDispatcher, "dispatch", ([args], res) => {
			if (!args || args.type != "MESSAGE_CREATE" || !args.channelId || !args.message.author) return res;
			const message = args.message;
			if (!this.settings.get("words", []).length) return res;
			if (message.author.id === currentUserId) return res;
			if (this.settings.get("blacklist", []).indexOf(message.guild_id) > -1 || FriendsModule.isBlocked(message.author.id)) return res;
			if (args.channelId === SelectedChannelStore.getChannelId() && document.hasFocus()) return res;
			if (MutedStore.isGuildOrCategoryOrChannelMuted(message.guild_id, message.channel_id)) return res;
			let content = message.content;

			let config = {matches: false, flash: false};
			this.settings.get("words", []).forEach(word => {
				if (!word.match.length) return;
				const regex = new RegExp(`(^|\\W)(${escapeString(word.match)})($|\\W)`, "gi");
				const replaced = content.replace(regex, '$1→$2←$3');
				if (replaced !== content && (word.ignores.length ? word.ignores.some(e => [args.channelId, message.guild_id, message.author.id].indexOf(e) < 0) : true)) {
					config = {matches: true, flash: word.flash ?? false};
					content = replaced;
				}
			});

			if (!config.matches) return res;
			const channel = ChannelStore.getChannel(message.channel_id);
			const guild = GuildStore.getGuild(message.guild_id);
			this.showNotification(channel, guild, message, content, config.flash);
		});
	}

	goToMessage(guild, channel, message) {
		Navigator.transitionTo(`/channels/${guild ? guild : '@me'}/${channel}/${message}`);
	}

	showNotification(channel, guild, message, content, flash) {
		const header = `${guild?.name ? `${guild.name} #` : ""}${channel.name} (${UnreadStore.getUnreadCount(channel.id)} unread)`;
		const body = `${MemberStore.getMember(guild?.id, message.author.id)?.nick ?? message.author.username}: ${content}`;
		if (this.settings.get("useVZ", true)) {
			const id = Math.random().toString(36).slice(2);
			vizality.api.notices.sendToast(id, {
				header: header,
				content: body,
				image: AvatarModule.getUserAvatarURL(message.author).replace("?size=128", "?size=32"),
				buttons: [
					{
						text: "Jump to Channel",
						color: 'green',
						onClick: () => {
							this.goToMessage(guild?.id, channel.id, message.id);
							vizality.api.notices.closeToast(id);
						}
					}
				]
			});
		} else {
			const notification = new Notification(header, {
				body: body,
				image: AvatarModule.getUserAvatarURL(message.author).replace("?size=128", "?size=32"),
			});
			notification.addEventListener("click", () => this.goToMessage(guild?.id, channel.id, message.id));
		}
		if (flash) Native.flashFrame(true);
	}

	stop() {
		unpatch("word-notifications-dispatcher");
	}
}