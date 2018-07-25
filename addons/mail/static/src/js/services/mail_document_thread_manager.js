odoo.define('mail.Manager.DocumentThread', function (require) {
"use strict";

var MailManager = require('mail.Manager');
var DocumentThread = require('mail.model.DocumentThread');

var session = require('web.session');

/**
 * Document Thread Manager
 *
 * This part of the mail manager extends the core functionnalities of mail
 * manager with document threads, in addition to enable cross tab
 * synchronization of document thread windows, through the local storage.
 *
 * Note that it assumes that the Mail Window Manager is loaded
 */
MailManager.include({
    DOCUMENT_THREAD_MESSAGE_KEY: 'mail.document_threads_last_message',
    DOCUMENT_THREAD_STATE_KEY: 'mail.document_threads_state',

    start: function () {
        this._super.apply(this, arguments);

        // retrieve the open DocumentThreads from the localStorage
        var state = this.call('local_storage', 'getItem', this.DOCUMENT_THREAD_STATE_KEY);
        if (!state) {
            this.call('local_storage', 'setItem', this.DOCUMENT_THREAD_STATE_KEY, '{}');
        } else {
            this.isReady().then(this._updateDocumentThreadWindows.bind(this, JSON.parse(state)));
        }
        // listen to localStorage changes to synchronize DocumentThread's
        // windows between tabs
        window.addEventListener('storage', this._onStorage.bind(this));
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * For new posted message of current user in a document thread: store it in
     * the localStorage to make it appear on the other tabs.
     *
     * Note: 'addMessage' modifies the message in place (by setting the channel_id,
     * so we must store the message in the localStorage *before* calling
     * 'addMessage')
     *
     * @override
     * @param {Object} data
     * @param {Array} [data.author_id] [int, string] where int is server ID of
     *   the author, and string is the name of the author.
     * @param {integer} data.id server ID of the message
     * @param {string} [data.model] the model name of the document that this
     *   message is related to.
     * @param {integer} [data.res_id] the ID of the document that this message
     *   is related to.
     *
     */
    addMessage: function (data) {
        var message = this.getMessage(data.id);
        if (
            !message &&
            data.res_id &&
            data.model &&
            data.author_id &&
            data.author_id[0] === session.partner_id
        ) {
            var key = this.DOCUMENT_THREAD_MESSAGE_KEY;
            this.call('local_storage', 'setItem', key, JSON.stringify(data));
        }
        return this._super.apply(this, arguments);
    },
    /**
     * Returns a document thread corresponding to the given model and resID.
     *
     * @param  {string} model of the document thread, if it exists
     * @return {integer} resID of the document thread, if it exists
     */
    getDocumentThread: function (model, resID) {
        return this.getThread(model + '_' + resID);
    },
    /**
     * Add a new document thread, or get if it exists already.
     *
     * Also, if a name is provided for the document thread, it overwrites the
     * previous one.
     *
     * @param {Object} params
     * @param {interger[]} [params.message_ids] the list of message ids linked
     *   to the document (if not given, they will be fetched before fetching the
     *   messages)
     * @param {string} [params.name] if provided, overwrites the name of the
     *   existing document thread
     * @param {integer} params.resID
     * @param {string} params.resModel
     * @return {mail.model.DocumentThread}
     */
    getOrAddDocumentThread: function (params) {
        var thread = this.getDocumentThread(params.resModel, params.resID);
        if (!thread) {
            thread = new DocumentThread({
                parent: this,
                data: {
                    messageIDs: params.messageIDs,
                    name: params.name,
                    resID: params.resID,
                    resModel: params.resModel,
                },
            });
            this._threads.push(thread);
        } else if (params.name) {
            if ('messageIDs' in params) {
                thread.setMessageIDs(params.messageIDs);
            }
            // document thread may have a change of name
            thread.setName(params.name);
        }
        return thread;
    },
    /**
     * Open the document thread form if discuss is open
     *
     * @override
     * @param {integer|string} threadID
     */
    openThread: function (threadID) {
        var thread = this.getThread(threadID);
        if (
            thread &&
            thread.getType() === 'document_thread' &&
            this._isDiscussOpen()
        ) {
            var resModel = thread.getDocumentModel();
            var resID = thread.getDocumentID();
            this._redirectToDocument(resModel, resID);
        } else {
            this._super.apply(this, arguments);
        }
    },
    /**
     * Updates the state of a given document thread (stored in localStorage).
     * Garbage collects windows previously marked as 'closed' (assuming that the
     * info has already been processed by the other tabs).
     *
     * @param {string} threadID ID of a document thread
     * @param {Object} state
     * @param {string} state.name name of the document thread
     * @param {string} state.windowState ('closed', 'folded' or 'open')
     */
    updateDocumentThreadState: function (threadID, state) {
        var item = this.call('local_storage', 'getItem', this.DOCUMENT_THREAD_STATE_KEY);
        var states = JSON.parse(item);
        states = _.omit(states, function (state) {
            return state.windowState === 'closed';
        });
        states[threadID] = state;
        this.call('local_storage', 'setItem',
            this.DOCUMENT_THREAD_STATE_KEY,
            JSON.stringify(states));
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * For new messages, postprocess document thread linked to this message.
     * If there is no such document thread, create it and register its ID to
     * the message's thread IDs.
     *
     * @override
     * @private
     * @param {mail.model.Message} message
     */
    _addNewMessagePostprocessThread: function (message) {
        var resModel = message.getDocumentModel();
        var resID = message.getDocumentID();
        if (resModel && resModel !== 'mail.channel' && resID) {
            this.getOrAddDocumentThread({
                name: message.getDocumentName(),
                resID: resID,
                resModel: resModel,
            });
        }
        this._super.apply(this, arguments);
    },
    /**
     * Updates the thread windows related to document threads.
     *
     * @param {Object} documentThreadStates - keys are strings 'resModel_resID',
     *   and values are the state of the corresponding document thread ('open'
     *   or 'folded')
     */
    _updateDocumentThreadWindows: function (documentThreadStates) {
        var self = this;
        _.each(documentThreadStates, function (state, key) {
            var info = key.split('_');
            var documentThread = self.getOrAddDocumentThread({
                name: state.name,
                resID: parseInt(info[1]),
                resModel: info[0],
            });
            if (state.windowState === 'closed') {
                documentThread.close();
            } else {
                documentThread.fold(state.windowState === 'folded');
                self.openThreadWindow(documentThread.getID(), { keepFoldState: true });
            }
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called each time a localStorage key is updated.
     *
     * @private
     * @param {StorageEvent} ev
     */
    _onStorage: function (ev) {
        if (ev.key === this.DOCUMENT_THREAD_STATE_KEY) {
            var state = this.call('local_storage', 'getItem', this.DOCUMENT_THREAD_STATE_KEY);
            this._updateDocumentThreadWindows(JSON.parse(state));
        } else if (ev.key === this.DOCUMENT_THREAD_MESSAGE_KEY) {
            var message = this.call('local_storage', 'getItem', this.DOCUMENT_THREAD_MESSAGE_KEY);
            if (message) {
                this.addMessage(JSON.parse(message));
            }
        }
    },

});

return MailManager;

});
