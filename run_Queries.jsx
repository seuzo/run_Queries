/*
run_Queries.jsx
(c)2008-2009 www.seuzo.jp
指定された検索クエリを連続実行します。

●履歴
2008-07-21	ver.0.1	とりあえず。http://d.hatena.ne.jp/seuzo/20080601/1212331508 の改良版。クエリを利用することで、モード、スタイルグループ、詳細形式を扱えるようにした。
2008-08-05	var.0.2	選択範囲がTextStyleRangeの時も正常に動作するようにした。選択範囲ダイアログで「キャンセル」をクリックした時、スクリプトが終了するようにした。
2009-05-18	ver.0.3	InDesign CS4対応。

*/

//ターゲットをInDesignにする
#target "InDesign"

////////////////////////////////////////////★ここでクエリを設定する。書式は["モード", "クエリ名"],
//指定モードは下記の通り
//text	テキスト
//grep	正規表現
//glyph	字形
//object	オブジェクト（不完全）
//transliterate	文字種変換

var my_Queries = [
["transliterate","半角カナ"],
["glyph","葛飾区"],
["text","カンマ"],
["grep","大見出し"],
["grep","中見出し"],
["grep","小見出し"],
["grep","図太字"],
];







////////////////////////////////////////////エラー処理 
function myerror(mess) { 
  if (arguments.length > 0) { alert(mess); }
  exit();
}

////////////////////////////////////////////ラジオダイアログ
/*
myTitle	ダイアログ（バー）のタイトル
myPrompt	メッセージ
myList	ラジオボタンに展開するリスト

result	選択したリスト番号
*/
function radioDialog(my_title, my_prompt, my_list){
	var my_dialog = app.dialogs.add({name:my_title, canCancel:true});
	with(my_dialog) {
		with(dialogColumns.add()) {
			// プロンプト
			staticTexts.add({staticLabel:my_prompt});
			with (borderPanels.add()) {
				var my_radio_group = radiobuttonGroups.add();
				with (my_radio_group) {
					for (var i = 0; i < my_list.length; i++){
						if (i == 0) {
							radiobuttonControls.add({staticLabel:my_list[i], checkedState:true});
						} else {
						radiobuttonControls.add({staticLabel:my_list[i]});
						}
					}
				}
			}
		}
	}
	if (my_dialog.show() == true) {
		var ans = my_radio_group.selectedButton;
		//正常にダイアログを片付ける
		my_dialog.destroy();
		//選択したアイテムの番号を返す
		return ans;
	} else {
		// ユーザが「キャンセル」をクリックしたので、メモリからダイアログボックスを削除
		my_dialog.destroy();
	}
}

////////////////////////////////////////////選択テキストのストーリを返す。選択チェックを兼ねる。
function get_story() {
	var mydocument = app.activeDocument;
	if (mydocument.selection.length == 0) {myerror("テキストを選択してください")}
	var myselection = mydocument.selection[0];
	var myclass =myselection.reflect.name;
	myclass = "Text, TextColumn, Story, Paragraph, Line, Word, Character, TextStyleRange".match(myclass);
	if (myclass == null) {myerror("テキストを選択してください")}
	return myselection.parentStory;//ストーリーオブジェクトを返す
}

////////////////////////////////////////////文字列を16進数にエスケープして、「\x{hex}」という形で返す。
function my_escape(str) {
tmp_str = escape(str);
return tmp_str.replace(/\%u([0-9A-F]+)/i, "\\x{$1}")
}

////////////////////////////////////////////正規表現検索でカタカナを16進に変換
function katakana2hex() {
	var find_str = app.findGrepPreferences.findWhat;
	while (/([ァ-ヴ])/.exec(find_str)) {
		find_str = find_str.replace(/([ァ-ヴ])/, my_escape(RegExp.$1));
	}
	app.findGrepPreferences.findWhat = find_str;//検索文字の設定
}


////////////////////////////////////////////以下処理
if (app.documents.length == 0) {myerror("ドキュメントが開かれていません")}
var mydocument = app.activeDocument;

//検索範囲を指定
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;
var my_range = radioDialog("run_Queries", "検索範囲を指定してください", ["選択範囲", "ストーリー", "ドキュメント"]);
if (my_range ==0) {//選択範囲
	get_story();//選択チェックとして使用
	var my_range_obj = mydocument.selection[0];
} else if (my_range == 1) {//ストーリー
	var my_range_obj = get_story();
} else if (my_range == 2) {//"ドキュメント"
	var my_range_obj = mydocument;
} else {
	myerror("処理をキャンセルしました");
}

//現在の設定を表示
var tmp = "現在の設定は下記の通りです\r";
for (var i = 0; i < my_Queries.length; i++){
tmp += my_Queries[i] + "\r";
}
if (! (confirm(tmp))) {myerror("")};//「いいえ」を選んだらエラーで中止


//検索置換
for (var i = 0; i < my_Queries.length; i++){
	try {
		var my_query_name = my_Queries[i][1];
		var my_mode = my_Queries[i][0];
		if (my_mode == "text") {
			my_mode = SearchModes.TEXT_SEARCH;
			app.loadFindChangeQuery(my_query_name, my_mode);//クエリをセットする
			my_range_obj.changeText();
		} else if (my_mode == "grep") {
			my_mode = SearchModes.GREP_SEARCH;
			app.loadFindChangeQuery(my_query_name, my_mode);//クエリをセットする
			if (parseInt(app.version) == 5) {
				katakana2hex();//カタカナにマッチしないバグ回避
			}
			my_range_obj.changeGrep();
		} else if (my_mode == "glyph") {
			my_mode = SearchModes.GLYPH_SEARCH;
			app.loadFindChangeQuery(my_query_name, my_mode);//クエリをセットする
			my_range_obj.changeGlyph ();
		} else if (my_mode == "object") {
			my_mode = SearchModes.OBJECT_SEARCH;
			app.loadFindChangeQuery(my_query_name, my_mode);//クエリをセットする
			my_range_obj.changeObject();
		} else if (my_mode == "transliterate") {
			my_mode = SearchModes.TRANSLITERATE_SEARCH;
			app.loadFindChangeQuery(my_query_name, my_mode);//クエリをセットする
			my_range_obj.changeTransliterate();
		} else {myerror("モードの記述が不正です：" +my_Queries[i][0] + "：" + my_query_name)}
	} catch(e) {
		myerror("エラーが発生しました：" + my_Queries[i][0] + "：" + my_query_name + "\r" + e);
	}
}

