import PageHero from '../components/PageHero.jsx'
import { useSite } from '../lib/content.jsx'
import { openCookieSettings } from '../lib/consent.js'
import { useSeo, pageSeo, itemSeo } from '../lib/seo.js'

export default function Privacy() {
  const { contacts, settings } = useSite()
  useSeo(pageSeo('privacy', settings))
  return (
    <>
      <PageHero eyebrow="Документы" title="Политика" accent="конфиденциальности" crumbs={[{ label: 'Политика конфиденциальности' }]} />
      <section className="section--tight">
        <div className="container article__body legal">
          <p>
            Мы бережно относимся к вашей приватности. Здесь описано, какие данные собирает сайт ProOrgazm, зачем
            и как ими можно управлять. Обработка персональных данных ведётся в соответствии с Федеральным законом
            № 152-ФЗ «О персональных данных».
          </p>

          <h2 className="display">Какие данные мы получаем</h2>
          <ul>
            <li>Имя, телефон и текст сообщения — если вы сами отправляете форму «Задать вопрос».</li>
            <li>Имя и текст отзыва — если вы оставляете отзыв.</li>
            <li>Анонимная статистика посещений — только с вашего согласия на аналитические cookie.</li>
          </ul>
          <p>Онлайн-запись проходит на сервисе DIKIDI и регулируется его собственной политикой.</p>

          <h2 className="display">Зачем</h2>
          <p>
            Данные из форм используются только для ответа на ваш вопрос и записи на сеанс. Мы не передаём их третьим
            лицам и не используем для рассылок.
          </p>

          <h2 className="display">Cookie</h2>
          <ul>
            <li><b>Необходимые</b> — подтверждение возраста, сохранение выбора по cookie, вход в панель управления. Без них сайт не работает.</li>
            <li><b>Аналитика</b> — случайный анонимный идентификатор и счётчик просмотров страниц и кликов по кнопкам записи и мессенджеров. Включается только после согласия.</li>
          </ul>
          <p>
            Изменить выбор можно в любой момент:{' '}
            <button className="legal__btn" onClick={openCookieSettings}>настройки cookie</button>.
          </p>

          <h2 className="display">Как удалить данные</h2>
          <p>
            Напишите нам на <a href={`mailto:${contacts.email}`}>{contacts.email}</a> или в любой мессенджер —
            удалим ваши заявки и отзывы.
          </p>
        </div>
      </section>
    </>
  )
}
