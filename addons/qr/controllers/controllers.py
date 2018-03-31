# -*- coding: utf-8 -*-
from odoo import http

# class Qr(http.Controller):
#     @http.route('/qr/qr/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/qr/qr/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('qr.listing', {
#             'root': '/qr/qr',
#             'objects': http.request.env['qr.qr'].search([]),
#         })

#     @http.route('/qr/qr/objects/<model("qr.qr"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('qr.object', {
#             'object': obj
#         })