import React from "react";
import {SwitchItem, Category, TextInput} from "@vizality/components/settings";
import {Button, Flex, TextInput as TextArea, Icon, Divider as _Divider, Text} from "@vizality/components";
import {getModule, getModuleByDisplayName} from "@vizality/webpack";

const _Checkbox = getModuleByDisplayName("Checkbox");
const classes = getModule("divider", "themed")

function VerticalDivider() {
	return <div className={classes.divider} />;
}

function Checkbox({value, onChange, label}) {
	const [checked, setChecked] = React.useState(value);

	return <Flex direction={Flex.Direction.HORIZONTAL} style={{alignItems: "center"}}>
		<Text>{label}</Text>
		<Margin left={5} />
		<_Checkbox value={checked} onChange={() => {setChecked(!checked); onChange(!checked);}} shape={_Checkbox.Shapes.ROUND} />
	</Flex>
} 

function Margin({top = 0, right = 0, bottom = 0, left = 0, all = 0}) {
	return <div style={all ? {margin: all} : {marginTop: top, marginRight: right, marginBottom: bottom, marginLeft: left}} />;
}

function Divider() {
	return <>
		<_Divider />
		<Margin all={20} />
	</>;
}


function Item({match: intialMatch, ignores: intialIgnores, onChange, onRemove, flash}) {
	const [state, setState] = React.useState({match: intialMatch, opened: false, ignores: intialIgnores, flash});
	const {match, opened, ignores} = state;
	const setValue = (what, value) => {
		onChange(what, value);
		setState({...state, [what]: value});
	}

	return <Category
		name={"Word: " + match}
		opened={opened}
		description={null}
		onChange={() => {
			setState({...state, opened: !opened})
		}}
	>
		<TextInput
			note="What should trigger a notification."
			onChange={value => setValue("match", value)}
			value={match}
			placeholder="Word"
		>Word to match:</TextInput>
		<Flex direction={Flex.Direction.HORIZONTAL}>
			<Button disabled={ignores.some(e => e.length == 0)} size={Button.Sizes.TINY} onClick={() => {
				if (ignores.some(e => e.length == 0)) return; // Double check
				setValue("ignores", ignores.concat(""));
			}}>Add new Ignore</Button>
			<VerticalDivider />
			<Button color={Button.Colors.RED} size={Button.Sizes.TINY} onClick={onRemove}>Remove Word</Button>
			<VerticalDivider />
			<Checkbox value={flash} onChange={value => setValue("flash", value)} label="Flash taskbar" />
		</Flex>
		<Divider />
		{ignores.map((ignore, i) => <>
			<Flex direction={Flex.Direction.HORIZONTAL}>
				<TextArea placeholder="guildId, userId or channelId" value={ignore} onChange={value => setValue("ingnores", (ignores[i] = value, ignores))} />
				<VerticalDivider />
				<Button color={Button.Colors.RED} size={Button.Sizes.ICON} onClick={() => setValue("ingnores", (ignores.splice(i, 1), ignores))}><Icon name="Close" /></Button>
			</Flex>	
			<Divider />
		</>)}
	</Category>;
}

export default settings => {
	const [words, setWords] = React.useState(settings.getSetting("words", []));

	const onChange = (index, what, value) => {
		words[index][what] = value;
		setWords(words);
		settings.updateSetting("words", words);
	}

	return <>
		<SwitchItem
			note="Use Vizality's notifications system instead of normal OS notifications."
			value={settings.getSetting("useVZ", true)}
			onChange={() => settings.toggleSetting("useVZ")}
		>Notification Service</SwitchItem>
		<Button size={Button.Sizes.LARGE} disabled={words.some(e => e.match.length == 0)} onClick={() => {
			if (words.some(e => e.match.length == 0)) return;
			const w = words.concat({match: "", ignores: []});
			setWords(w);
			settings.updateSetting("words", w);
		}}>Add new Word</Button>
		<Divider />
		{words.map((e, i) => <Item {...e} onChange={(what, value) => onChange(i, what, value)} onRemove={() => {
			const temp = [...words]; // Thanks React
			temp.splice(i, 1);
			setWords(temp);
		}} />)}
	</>;
}