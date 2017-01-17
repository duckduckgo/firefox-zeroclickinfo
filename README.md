firefox-zeroclickinfo
=====================

DuckDuckGo enhancements for Firefox.

This addon can

- add a handy DuckDuckGo toolbar button to your browser for easy access to !bang tags (removable).
- add DuckDuckGo as your default search engine through the address bar, search bar and context right-click menu (reversible).
- show DuckDuckGo instant answers on Google/Bing (removable).


Setting the partner parameter
-----------------------------

First of all, there is a `PARTNER_QUERY_ADDITION` constant in
[lib/main.js](lib/main.js) that should be set to something like `&t=partnerid`
in order to function properly.

Also, you might want to add the `t` parameter to the search engine definition
which is located at [data/search.xml](data/search.xml). It usually has a form
of `<Param name="t" value="partnerid"/>`.

You can easily automate both these steps by running

    $ make partnerxpi PARTNER_ID=partnerid

which will do both steps for you and provided that you have the [Add-on
SDK](https://developer.mozilla.org/en-US/Add-ons/SDK) installed it will try to
build it for you into a file `ddg_for_firefox-partnerid.xpi`.


Dependencies
--------------

jpm is required.

- Install through node: `npm install jpm`
- Update PATH: `export PATH="$HOME/node_modules/.bin/:$PATH"`

Find more information on [MDN](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm)


Testing Checklist
-----------------

Since we don't yet have automated tests, here is a checklist of manual tests to perform:

- [ ] Extension installs

- [ ] Popup opens

- [ ] Search box is empty

- [ ] Search works and defaults to DDG

- [ ] Click a bang, the bang is added to the search box

- [ ] Click another bang, the bang in the search box is replaced

- [ ] Search with bang works

- [ ] Expand/collapse button on right of search hides the bang options

- [ ] Click "I'm feeling ducky" and search. Redirects to first organic

- [ ] Modified options, both in the popup and in the options.html page, are saved

- [ ] When safe search is unchecked, the URL for a search contains the `&kp=-1` parameter

- [ ] When "remember last search" is checked, on popup open the search box will contain the last performed search
