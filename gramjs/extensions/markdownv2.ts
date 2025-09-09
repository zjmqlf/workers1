import { Api } from "../tl";
import { HTMLParser } from "./html";

export class MarkdownV2Parser {
    static parse(message: string): [string, Api.TypeMessageEntity[]] {
        message = message.replace(/\*(.*?)\*/g, "<b>$1</b>");
        message = message.replace(/__(.*?)__/g, "<u>$1</u>");
        message = message.replace(/~(.*?)~/g, "<s>$1</s>");
        message = message.replace(/-(.*?)-/g, "<i>$1</i>");
        message = message.replace(/```([\s\S]*?)```/g, "<pre>$1</pre>");
        message = message.replace(/`(.*?)`/g, "<code>$1</code>");
        message = message.replace(/\|\|(.*?)\|\|/g, "<spoiler>$1</spoiler>");
        message = message.replace(
            /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2">$1</a>'
        );
        message = message.replace(
            /!\[([^\]]+)\]\(tg:\/\/emoji\?id=(\d+)\)/g,
            '<tg-emoji emoji-id="$2">$1</tg-emoji>'
        );

        return HTMLParser.parse(message);
    }

    static unparse(
        text: string,
        entities: Api.TypeMessageEntity[] | undefined
    ) {
        text = HTMLParser.unparse(text, entities);
        text = text.replace(/<b>(.*?)<\/b>/g, "*$1*");
        text = text.replace(/<u>(.*?)<\/u>/g, "__$1__");
        text = text.replace(/<code>(.*?)<\/code>/g, "`$1`");
        text = text.replace(/<pre>(.*?)<\/pre>/g, "```$1```");
        text = text.replace(/<s>(.*?)<\/s>/g, "~$1~");
        text = text.replace(/<i>(.*?)<\/i>/g, "-$1-");
        text = text.replace(/<spoiler>(.*?)<\/spoiler>/g, "||$1||");
        text = text.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, "[$2]($1)");
        text = text.replace(
            /<tg-emoji emoji-id="(\d+)">([^<]+)<\/tg-emoji>/g,
            "![$2](tg://emoji?id=$1)"
        );

        return text;
    }
}
