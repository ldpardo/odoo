# -*- coding: utf-8 -*-
from odoo import http

# class Qrcodes(http.Controller):
#     @http.route('/qrcodes/qrcodes/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/qrcodes/qrcodes/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('qrcodes.listing', {
#             'root': '/qrcodes/qrcodes',
#             'objects': http.request.env['qrcodes.qrcodes'].search([]),
#         })

#     @http.route('/qrcodes/qrcodes/objects/<model("qrcodes.qrcodes"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('qrcodes.object', {
#             'object': obj
#         })