'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './FAQ.module.css';
import Reveal from './Reveal';

const faqs = [
  {
    question: 'А это правда буду я, или просто похожее лицо?',
    answer: 'Мы используем передовую технологию, которая обучается именно на ваших уникальных чертах лица. Результат — это 100% вы, без эффекта «пластикового» или чужого человека.',
  },
  {
    question: 'Безопасно ли загружать свои фото?',
    answer: 'Абсолютно. Ваши исходные селфи используются только один раз для обучения модели и автоматически удаляются с наших серверов через 24 часа. Мы никому их не передаем.',
  },
  {
    question: 'Сколько фотографий мне нужно загрузить?',
    answer: 'Достаточно 10–20 обычных селфи с разных ракурсов при хорошем освещении. Чем разнообразнее фото (разная мимика, разный фон), тем точнее будет финальный результат.',
  },
  {
    question: 'Сколько времени занимает генерация?',
    answer: 'Обычно процесс обучения вашей персональной модели и генерации занимает от 15 до 30 минут. Как только профессиональные фото будут готовы, они появятся в вашем личном кабинете.',
  },
  {
    question: 'Что если мне не понравится результат?',
    answer: 'У нас более 20 различных направлений и бесконечное количество вариаций. Если первый результат вас не устроит, вы всегда можете попробовать другой стиль или загрузить другие селфи — наша нейросеть обучается под ваши пожелания.',
  },
  {
    question: 'Кому принадлежат права на созданные фото?',
    answer: 'Все права принадлежат вам. Вы можете использовать изображения в коммерческих целях, для рекламы, в соцсетях, на билбордах или в резюме без каких-либо ограничений и отчислений нам.',
  },
  {
    question: 'Нужно ли мне уметь работать с искусственным интеллектом?',
    answer: 'Абсолютно нет! Никаких сложных «промптов» или настроек. Мы сделали интерфейс максимально простым: вы просто загружаете фото и выбираете понравившийся стиль одним кликом.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={`${styles.faqSection} section`} id="faq">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Частые <span className="gradient-text">вопросы</span>
          </h2>
          <p className="section-subtitle">
            Отвечаем на то, что обычно больше всего волнует наших клиентов
          </p>
        </Reveal>

        <div className={styles.accordionContainer}>
          {faqs.map((faq, idx) => (
            <Reveal key={idx} delay={idx + 1}>
              <div 
                className={`${styles.accordionItem} ${openIndex === idx ? styles.active : ''}`}
                onClick={() => toggleOpen(idx)}
              >
                <div className={styles.accordionHeader}>
                  <h3 className={styles.question}>{faq.question}</h3>
                  <div className={`${styles.iconWrapper} ${openIndex === idx ? styles.rotated : ''}`}>
                    <ChevronDown size={20} />
                  </div>
                </div>
                <div 
                  className={styles.accordionContentWrapper}
                  style={{ maxHeight: openIndex === idx ? '200px' : '0' }}
                >
                  <div className={styles.accordionContent}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
