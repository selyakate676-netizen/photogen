'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './FAQ.module.css';
import Reveal from './Reveal';

const faqs = [
  {
    question: 'А это правда буду я, или просто похожее лицо?',
    answer: 'Загруженные фотографии используются как референсы внешности при создании новых кадров. AI старается сохранить узнаваемые черты, но результат генерации может отличаться от исходных фотографий.',
  },
  {
    question: 'Безопасно ли загружать свои фото?',
    answer: 'Исходные фотографии хранятся в закрытом хранилище и могут повторно использоваться только для ваших фотосессий. Доступную для удаления Persona можно удалить в профиле вместе с её записями и связанными исходными файлами.',
  },
  {
    question: 'Сколько фотографий мне нужно загрузить?',
    answer: 'Для Persona можно загрузить от 1 до 5 обычных фотографий. Лучше выбирать чёткие кадры при хорошем освещении, где лицо хорошо видно; разные ракурсы помогают передать внешность точнее.',
  },
  {
    question: 'Сколько времени занимает генерация?',
    answer: 'Генерация обычно занимает несколько минут, но фактическое время зависит от загрузки сервиса и сложности фотосессии. Готовые изображения появятся в разделе «Мои генерации».',
  },
  {
    question: 'Что если мне не понравится результат?',
    answer: 'Результат AI-генерации может отличаться от ожиданий. Можно выбрать другой доступный фотопак или обновить фотографии Persona перед новой фотосессией.',
  },
  {
    question: 'Где можно использовать созданные фото?',
    answer: 'PhotoGen не ограничивает использование результатов в личных и коммерческих целях — в социальных сетях, личном бренде, рекламе, на сайтах и в материалах бизнеса, — если это соответствует закону и не нарушает права третьих лиц.',
  },
  {
    question: 'Нужно ли мне уметь работать с искусственным интеллектом?',
    answer: 'Нет. Сервис не требует самостоятельного написания промптов: загрузите фотографии, создайте Persona и выберите фотопак.',
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
            Отвечаем на вопросы о Persona и генерации фотографий
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
