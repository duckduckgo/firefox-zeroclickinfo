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
