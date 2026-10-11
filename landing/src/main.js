import './style.css'
import { initMotion } from './motion.js'

const WHATSAPP_NUMBER = '5491138753141'
const WHATSAPP_MESSAGE = 'Hola! Quiero información sobre Power Routine para mi gimnasio.'

document.getElementById('year').textContent = String(new Date().getFullYear())

const whatsappLink = document.getElementById('whatsapp-cta')
whatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

initMotion()
